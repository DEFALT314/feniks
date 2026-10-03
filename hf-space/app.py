"""Embedding service for HubMI (private Hugging Face Space).

    GET  /health   warm-up and status, no token
    POST /embed    {"texts": [...], "kind": "query" | "passage"} → {"model", "dim", "vectors"}
                   requires header  X-Embed-Token: <EMBED_TOKEN> (or Authorization: Bearer)

Model: sdadas/mmlw-e5-base as a pruned int8 ONNX model built by export_onnx.py. Vectors have
768 dims and unit length, so similarity = dot product. The e5 family needs the "query: " /
"passage: " prefixes, which this service adds based on `kind`.

Local: EMBED_TOKEN=dev uvicorn app:app --port 7860   (from hf-space/, after export_onnx.py)
"""

import hmac
import os
from functools import cache
from pathlib import Path

import numpy as np
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

MODEL_DIR = Path(os.environ.get("MODEL_DIR", Path(__file__).parent / "model"))
PREFIX = {"query": "query: ", "passage": "passage: "}
MAX_TOKENS = 512

app = FastAPI(title="HubMI embeddings")


@cache
def load_model():
    """Load once per process; the first request after a cold start pays ~2 s."""
    import onnxruntime as ort
    from tokenizers import Tokenizer

    tokenizer = Tokenizer.from_file(str(MODEL_DIR / "tokenizer.json"))
    tokenizer.enable_truncation(MAX_TOKENS)
    tokenizer.enable_padding(pad_id=tokenizer.token_to_id("<pad>"), pad_token="<pad>")
    options = ort.SessionOptions()
    options.intra_op_num_threads = int(os.environ.get("ORT_THREADS", "2"))
    session = ort.InferenceSession(str(MODEL_DIR / "model.onnx"), options, providers=["CPUExecutionProvider"])
    name = (MODEL_DIR / "MODEL").read_text().strip()
    return name, tokenizer, session


def encode(texts: list[str], kind: str, batch_size: int = 32) -> np.ndarray:
    _, tokenizer, session = load_model()
    out = []
    for start in range(0, len(texts), batch_size):
        enc = tokenizer.encode_batch([PREFIX[kind] + t for t in texts[start : start + batch_size]])
        ids = np.array([e.ids for e in enc], dtype=np.int64)
        mask = np.array([e.attention_mask for e in enc], dtype=np.int64)
        (hidden,) = session.run(None, {"input_ids": ids, "attention_mask": mask})
        v = hidden[:, 0]  # mmlw-e5 uses CLS pooling: the first token's vector
        out.append(v / np.linalg.norm(v, axis=1, keepdims=True))
    return np.concatenate(out)


def require_token(
    authorization: str | None = Header(None), x_embed_token: str | None = Header(None)
) -> None:
    """Accept the token as `X-Embed-Token` (needed for a private Space, where `Authorization`
    carries the Hugging Face token for the Space proxy) or as `Authorization: Bearer`."""
    expected = os.environ.get("EMBED_TOKEN")
    if not expected:
        raise HTTPException(500, "EMBED_TOKEN is not configured")
    ok = (x_embed_token and hmac.compare_digest(x_embed_token, expected)) or (
        authorization and hmac.compare_digest(authorization, f"Bearer {expected}")
    )
    if not ok:
        raise HTTPException(401, "invalid or missing token")


class EmbedRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=256)
    kind: str = Field("query", pattern="^(query|passage)$")


class EmbedResponse(BaseModel):
    model: str
    dim: int
    vectors: list[list[float]]


@app.get("/health")
def health():
    name, _, _ = load_model()
    return {"ok": True, "model": name}


@app.post("/embed", response_model=EmbedResponse, dependencies=[Depends(require_token)])
def embed(req: EmbedRequest):
    vectors = encode([t[:4000] for t in req.texts], req.kind)
    return EmbedResponse(model=load_model()[0], dim=vectors.shape[1], vectors=vectors.round(6).tolist())
