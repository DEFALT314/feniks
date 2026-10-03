"""Tests for the embedding service.  Run from hf-space/:  pytest -q

The tests marked `needs_model` use the real exported model (hf-space/model/) and are skipped
when it has not been built (run export_onnx.py first).
"""

import numpy as np
import pytest
from fastapi.testclient import TestClient

import app as service

client = TestClient(service.app)
AUTH = {"Authorization": "Bearer secret"}
needs_model = pytest.mark.skipif(not (service.MODEL_DIR / "model.onnx").exists(), reason="model not exported")


@pytest.fixture(autouse=True)
def token(monkeypatch):
    monkeypatch.setenv("EMBED_TOKEN", "secret")


@pytest.fixture
def fake_encode(monkeypatch):
    calls = []

    def encode(texts, kind):
        calls.append((texts, kind))
        return np.ones((len(texts), 3)) / np.sqrt(3)

    monkeypatch.setattr(service, "encode", encode)
    monkeypatch.setattr(service, "load_model", lambda: ("test-model", None, None))
    return calls


def test_embed_requires_token(fake_encode):
    assert client.post("/embed", json={"texts": ["a"]}).status_code == 401
    assert client.post("/embed", json={"texts": ["a"]}, headers={"Authorization": "Bearer wrong"}).status_code == 401


def test_embed_accepts_token_in_x_embed_token_header(fake_encode):
    # Private Space: Authorization carries the Hugging Face token, ours goes in X-Embed-Token.
    headers = {"Authorization": "Bearer hf_space_token", "X-Embed-Token": "secret"}
    assert client.post("/embed", json={"texts": ["a"]}, headers=headers).status_code == 200
    assert client.post("/embed", json={"texts": ["a"]}, headers={"X-Embed-Token": "wrong"}).status_code == 401


def test_embed_refuses_when_token_not_configured(fake_encode, monkeypatch):
    monkeypatch.delenv("EMBED_TOKEN")
    assert client.post("/embed", json={"texts": ["a"]}, headers=AUTH).status_code == 500


def test_embed_returns_vectors_and_passes_kind(fake_encode):
    r = client.post("/embed", json={"texts": ["a", "b"], "kind": "passage"}, headers=AUTH)
    assert r.status_code == 200
    body = r.json()
    assert body["model"] == "test-model" and body["dim"] == 3 and len(body["vectors"]) == 2
    assert fake_encode == [(["a", "b"], "passage")]


@pytest.mark.parametrize(
    "payload", [{"texts": []}, {"texts": ["a"], "kind": "document"}, {"texts": ["a"] * 257}, {}]
)
def test_embed_validates_input(fake_encode, payload):
    assert client.post("/embed", json=payload, headers=AUTH).status_code == 422


def test_health_needs_no_token(fake_encode, monkeypatch):
    monkeypatch.delenv("EMBED_TOKEN")
    assert client.get("/health").json() == {"ok": True, "model": "test-model"}


@needs_model
def test_real_model_adds_e5_prefixes(monkeypatch):
    seen = []
    _, tokenizer, _ = service.load_model()
    original = tokenizer.encode_batch
    monkeypatch.setattr(tokenizer, "encode_batch", lambda texts: seen.extend(texts) or original(texts), raising=False)
    service.encode(["samotni seniorzy"], "query")
    service.encode(["samotni seniorzy"], "passage")
    assert seen == ["query: samotni seniorzy", "passage: samotni seniorzy"]


@needs_model
def test_real_model_vectors_are_unit_length_and_meaningful():
    q = service.encode(["Babcia mieszka sama i jest smutna"], "query")[0]
    related, unrelated = service.encode(
        ["Seniorzy czują się samotni, brakuje im kontaktu z ludźmi", "Brakuje miejsc parkingowych przy szkole"], "passage"
    )
    assert q.shape == (768,)
    assert abs(np.linalg.norm(q) - 1) < 1e-5
    assert q @ related > q @ unrelated + 0.03


@needs_model
def test_real_model_handles_ukrainian():
    q = service.encode(["Як записатися до сімейного лікаря?"], "query")[0]
    health, other = service.encode(
        ["Przewodnik po polskiej opiece zdrowotnej dla cudzoziemców", "Gra planszowa o urzędach"], "passage"
    )
    assert q @ health > q @ other
