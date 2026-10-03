# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["torch", "transformers", "sentence-transformers", "onnx", "onnxscript", "onnxruntime", "numpy"]
# [tool.uv]
# extra-index-url = ["https://download.pytorch.org/whl/cpu"]
# ///
"""Convert the embedding model to a small int8 ONNX model served by app.py (no torch at runtime).

Runs in the first stage of the Dockerfile, or locally:
    uv run hf-space/export_onnx.py [output_dir]          # default output: hf-space/model
Output: model.onnx (int8), tokenizer.json, MODEL (model name).

Vocabulary pruning: the model is multilingual (250k tokens) and most of its weights are the
embedding table for scripts we never use. We keep Latin-script and Cyrillic tokens (Ukrainian and
Russian speakers are a key user group: refugees and migrants). The Unigram tokenizer picks the best
segmentation from the available pieces; for Polish text the best segmentation is made of Latin
pieces anyway, so tokenization (and the vectors) stay identical. The script checks this on sample
texts and, when run inside the repo, on the whole catalog and the accuracy test set.
Measured on the matchmaking evals: same results as the full model (cosine to torch output ≥ 0.99).
"""

import json
import os
import re
import sys
from pathlib import Path

import torch
from onnxruntime.quantization import QuantType, quantize_dynamic
from tokenizers import Tokenizer
from transformers import AutoModel, AutoTokenizer

MODEL = os.environ.get("EMBED_MODEL", "sdadas/mmlw-e5-base")
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parent / "model")
OUT.mkdir(parents=True, exist_ok=True)
REPO = Path(__file__).resolve().parent.parent

KEEP = re.compile(
    r"^[▁\sA-Za-z0-9Ѐ-ӿąćęłńóśźżĄĆĘŁŃÓŚŹŻáéíúýčďěňřšťůžäöüßàâçèêëîïôûœÁÉÍÚÝČĎĚŇŘŠŤŮŽÄÖÜ"
    r"\-.,;:!?'\"()\[\]/&%+*=<>@#$€–—…„”“»«°§_|~^]+$"
)

SAMPLES = [
    "Zażółć gęślą jaźń — „cytat” 50% ul. Długa 5/7, e-mail i telefon.",
    "Seniorzy w naszej gminie są samotni i potrzebują wsparcia.",
    "Моя дитина не розуміє правил у польській школі.",
    "Elderly people struggle with ticket machines and ATMs.",
]


def check_texts() -> list[str]:
    texts = list(SAMPLES)
    gold = REPO / "data" / "rops" / "gold_matchmaking.jsonl"
    catalog = REPO / "data" / "rops" / "biblioteka.json"
    if gold.exists():
        texts += [json.loads(line)["zapytanie"] for line in gold.read_text().splitlines() if line.strip()]
    if catalog.exists():
        for item in json.loads(catalog.read_text())["innowacje"]:
            texts.append(" ".join(str(v) for v in item.values() if isinstance(v, (str, list))))
    return texts


tokenizer = AutoTokenizer.from_pretrained(MODEL)
model = AutoModel.from_pretrained(MODEL).eval()

# --- prune the vocabulary ---
spec = json.loads(tokenizer.backend_tokenizer.to_str())
vocab = spec["model"]["vocab"]
special = {a["id"] for a in spec["added_tokens"]}
keep = [i for i, (piece, _) in enumerate(vocab) if i in special or KEEP.match(piece)]
new_id = {old: new for new, old in enumerate(keep)}
spec["model"]["vocab"] = [vocab[i] for i in keep]
spec["model"]["unk_id"] = new_id[spec["model"]["unk_id"]]
for a in spec["added_tokens"]:
    a["id"] = new_id[a["id"]]
for s in spec["post_processor"].get("special_tokens", {}).values():
    s["ids"] = [new_id[i] for i in s["ids"]]
pruned = Tokenizer.from_str(json.dumps(spec))

old_emb = model.get_input_embeddings()
new_emb = torch.nn.Embedding(len(keep), old_emb.weight.shape[1])
new_emb.weight.data = old_emb.weight.data[keep].clone()
model.set_input_embeddings(new_emb)
model.config.vocab_size = len(keep)
print(f"vocabulary: {len(vocab)} → {len(keep)} tokens")

# --- check: identical tokenization ---
texts = check_texts()
for text in texts:
    for prefix in ("query: ", "passage: "):
        expected = [new_id.get(i, -1) for i in tokenizer(prefix + text)["input_ids"]]
        assert pruned.encode(prefix + text).ids == expected, f"tokenization differs: {text[:60]}"
print(f"tokenization identical for {len(texts)} texts")


class Encoder(torch.nn.Module):
    def __init__(self, m):
        super().__init__()
        self.m = m

    def forward(self, input_ids, attention_mask):
        return self.m(input_ids=input_ids, attention_mask=attention_mask).last_hidden_state


fp32 = OUT / "model_fp32.onnx"
sample = pruned.encode("query: przykład")
torch.onnx.export(
    Encoder(model),
    (torch.tensor([sample.ids]), torch.tensor([sample.attention_mask])),
    str(fp32),
    input_names=["input_ids", "attention_mask"],
    output_names=["last_hidden_state"],
    dynamic_axes={
        "input_ids": {0: "batch", 1: "seq"},
        "attention_mask": {0: "batch", 1: "seq"},
        "last_hidden_state": {0: "batch", 1: "seq"},
    },
    opset_version=17,
    dynamo=False,
)
quantize_dynamic(str(fp32), str(OUT / "model.onnx"), weight_type=QuantType.QInt8)
for f in OUT.glob("model_fp32.onnx*"):
    f.unlink()

pruned.save(str(OUT / "tokenizer.json"))
(OUT / "MODEL").write_text(MODEL + "\n")
print(OUT, {p.name: f"{p.stat().st_size / 1e6:.1f} MB" for p in sorted(OUT.iterdir())})
