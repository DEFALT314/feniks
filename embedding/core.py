"""Embedding service core, shared by the Vercel function (api/embed.py) and the local server.

Model: sdadas/mmlw-e5-base as a pruned int8 ONNX model (export_onnx.py). Vectors have 768 dims and
unit length, so similarity = dot product. The e5 family needs the "query: " / "passage: " prefixes,
which `encode` adds based on `kind`.

The model (~200 MB) is too large for the GitHub repo, so it lives in a private Hugging Face model
repo and is downloaded to /tmp on a cold start. Configuration (server environment variables):
    EMBED_TOKEN        required; callers send it in the X-Embed-Token header
    HF_TOKEN           read token for the private model repo
    EMBED_MODEL_REPO   default "defalt314/hubmi-mmlw-e5-base-onnx"
    EMBED_MODEL_DIR    use a local model folder instead of downloading (development, tests)
"""

import hmac
import json
import os
import threading
import urllib.request
from functools import cache
from pathlib import Path

import numpy as np

PREFIX = {"query": "query: ", "passage": "passage: "}
MAX_TEXTS = 256
MAX_CHARS = 4000
MAX_TOKENS = 512
MODEL_FILES = ("model.onnx", "tokenizer.json", "MODEL")
MODEL_REPO = os.environ.get("EMBED_MODEL_REPO", "defalt314/hubmi-mmlw-e5-base-onnx")
DOWNLOAD_DIR = Path("/tmp/hubmi-embed-model")
_download_lock = threading.Lock()


class BadRequest(ValueError):
    pass


def _download(name: str, dest: Path) -> None:
    request = urllib.request.Request(f"https://huggingface.co/{MODEL_REPO}/resolve/main/{name}")
    if token := os.environ.get("HF_TOKEN"):
        request.add_header("Authorization", f"Bearer {token}")
    part = dest.with_suffix(dest.suffix + ".part")
    with urllib.request.urlopen(request, timeout=120) as response, open(part, "wb") as f:
        while chunk := response.read(1 << 20):
            f.write(chunk)
    part.replace(dest)  # atomic: a crashed download never leaves a truncated model behind


def model_dir() -> Path:
    if local := os.environ.get("EMBED_MODEL_DIR"):
        return Path(local)
    with _download_lock:
        DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
        for name in MODEL_FILES:
            if not (DOWNLOAD_DIR / name).exists():
                _download(name, DOWNLOAD_DIR / name)
    return DOWNLOAD_DIR


@cache
def load_model():
    """Load once per process (cold start: download ~3 s + load ~2 s)."""
    import onnxruntime as ort
    from tokenizers import Tokenizer

    path = model_dir()
    tokenizer = Tokenizer.from_file(str(path / "tokenizer.json"))
    tokenizer.enable_truncation(MAX_TOKENS)
    tokenizer.enable_padding(pad_id=tokenizer.token_to_id("<pad>"), pad_token="<pad>")
    options = ort.SessionOptions()
    options.intra_op_num_threads = int(os.environ.get("ORT_THREADS", "2"))
    session = ort.InferenceSession(str(path / "model.onnx"), options, providers=["CPUExecutionProvider"])
    return (path / "MODEL").read_text().strip(), tokenizer, session


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


def check_token(headers) -> None:
    """Raise PermissionError unless the X-Embed-Token header matches EMBED_TOKEN."""
    expected = os.environ.get("EMBED_TOKEN")
    if not expected:
        raise RuntimeError("EMBED_TOKEN is not configured")
    given = headers.get("X-Embed-Token") or ""
    if not hmac.compare_digest(given.encode(), expected.encode()):
        raise PermissionError("invalid or missing token")


def parse_request(body: bytes) -> tuple[list[str], str]:
    try:
        data = json.loads(body or b"{}")
    except json.JSONDecodeError as e:
        raise BadRequest("body must be JSON") from e
    texts, kind = data.get("texts") if isinstance(data, dict) else None, (data or {}).get("kind", "query")
    if not isinstance(texts, list) or not texts or not all(isinstance(t, str) for t in texts):
        raise BadRequest('"texts" must be a non-empty list of strings')
    if len(texts) > MAX_TEXTS:
        raise BadRequest(f'"texts" may contain at most {MAX_TEXTS} items')
    if kind not in PREFIX:
        raise BadRequest('"kind" must be "query" or "passage"')
    return [t[:MAX_CHARS] for t in texts], kind


def handle_health() -> tuple[int, dict]:
    return 200, {"ok": True, "model": load_model()[0]}


def handle_embed(headers, body: bytes) -> tuple[int, dict]:
    try:
        check_token(headers)
        texts, kind = parse_request(body)
    except RuntimeError as e:
        return 500, {"error": str(e)}
    except PermissionError as e:
        return 401, {"error": str(e)}
    except BadRequest as e:
        return 422, {"error": str(e)}
    vectors = encode(texts, kind)
    return 200, {"model": load_model()[0], "dim": int(vectors.shape[1]), "vectors": vectors.round(6).tolist()}
