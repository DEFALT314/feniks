"""Tests for the embedding service.  From the repo root:  python -m pytest -q embedding

Tests marked `needs_model` use the real exported model in embedding/model/ and are skipped when it
has not been built (uv run embedding/export_onnx.py).
"""

import hashlib
import io
import json
import threading
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

import numpy as np
import pytest

from embedding import core

LOCAL_MODEL = Path(__file__).parent / "model"
needs_model = pytest.mark.skipif(not (LOCAL_MODEL / "model.onnx").exists(), reason="model not exported")
TOKEN = {"X-Embed-Token": "secret"}


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("EMBED_TOKEN", "secret")


@pytest.fixture
def fake_model(monkeypatch):
    calls = []

    def encode(texts, kind):
        calls.append((texts, kind))
        return np.ones((len(texts), 3)) / np.sqrt(3)

    monkeypatch.setattr(core, "encode", encode)
    monkeypatch.setattr(core, "load_model", lambda: ("test-model", None, None))
    return calls


# --- request validation and auth ---


@pytest.mark.parametrize(
    "body",
    [b"", b"not json", b'{"texts": []}', b'{"texts": "a"}', b'{"texts": [1]}', b'{"texts": ["a"], "kind": "doc"}',
     json.dumps({"texts": ["a"] * 257}).encode(), b"[]"],
)
def test_invalid_requests_are_rejected(fake_model, body):
    status, payload = core.handle_embed(TOKEN, body)
    assert status == 422 and "error" in payload
    assert fake_model == []


def test_token_is_required(fake_model):
    assert core.handle_embed({}, b'{"texts": ["a"]}')[0] == 401
    assert core.handle_embed({"X-Embed-Token": "wrong"}, b'{"texts": ["a"]}')[0] == 401
    assert fake_model == []


def test_missing_server_token_is_an_error_not_open_access(fake_model, monkeypatch):
    monkeypatch.delenv("EMBED_TOKEN")
    assert core.handle_embed(TOKEN, b'{"texts": ["a"]}')[0] == 500


def test_valid_request_returns_vectors_and_truncates_long_texts(fake_model):
    status, payload = core.handle_embed(TOKEN, json.dumps({"texts": ["a", "x" * 5000], "kind": "passage"}).encode())
    assert status == 200
    assert payload["model"] == "test-model" and payload["dim"] == 3 and len(payload["vectors"]) == 2
    texts, kind = fake_model[0]
    assert kind == "passage" and len(texts[1]) == core.MAX_CHARS


def test_kind_defaults_to_query(fake_model):
    core.handle_embed(TOKEN, b'{"texts": ["a"]}')
    assert fake_model[0][1] == "query"


# --- model download ---


def test_download_from_release_verifies_checksum(monkeypatch, tmp_path):
    seen = []

    def fake_urlopen(url, timeout):
        seen.append(url)
        return io.BytesIO(b"model-bytes")

    monkeypatch.setattr(core.urllib.request, "urlopen", fake_urlopen)
    monkeypatch.setitem(core.MODEL_SHA256, "model.onnx", hashlib.sha256(b"model-bytes").hexdigest())
    core._download("model.onnx", tmp_path / "model.onnx")
    assert (tmp_path / "model.onnx").read_bytes() == b"model-bytes"
    assert not list(tmp_path.glob("*.part"))
    assert seen == [f"{core.MODEL_RELEASE_URL}/model.onnx"]


def test_download_with_wrong_checksum_is_rejected(monkeypatch, tmp_path):
    monkeypatch.setattr(core.urllib.request, "urlopen", lambda url, timeout: io.BytesIO(b"tampered"))
    with pytest.raises(OSError, match="checksum"):
        core._download("model.onnx", tmp_path / "model.onnx")
    assert list(tmp_path.iterdir()) == []


def test_model_dir_downloads_only_missing_files(monkeypatch, tmp_path):
    monkeypatch.delenv("EMBED_MODEL_DIR", raising=False)
    monkeypatch.setattr(core, "DOWNLOAD_DIR", tmp_path)
    (tmp_path / "MODEL").write_text("cached")
    downloaded = []
    monkeypatch.setattr(core, "_download", lambda name, dest: downloaded.append(name) or dest.write_text("x"))
    assert core.model_dir() == tmp_path
    assert sorted(downloaded) == ["model.onnx", "tokenizer.json"]
    assert core.model_dir() == tmp_path and len(downloaded) == 2  # second call: no download  # second call: no download


def test_failed_download_leaves_no_file(monkeypatch, tmp_path):
    def fail(url, timeout):
        raise urllib.error.URLError("offline")

    monkeypatch.setattr(core.urllib.request, "urlopen", fail)
    with pytest.raises(urllib.error.URLError):
        core._download("model.onnx", tmp_path / "model.onnx")
    assert list(tmp_path.iterdir()) == []


# --- the Vercel handler over real HTTP ---


@pytest.fixture
def server(fake_model):
    from api.embed import handler

    httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{httpd.server_port}/api/embed"
    httpd.shutdown()


def _post(url, body: bytes, headers: dict):
    request = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json", **headers})
    try:
        with urllib.request.urlopen(request) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, json.load(e)


def test_handler_serves_health_and_embed(server):
    with urllib.request.urlopen(server) as r:
        assert json.load(r) == {"ok": True, "model": "test-model"}
    assert _post(server, b'{"texts": ["a"]}', TOKEN)[0] == 200
    assert _post(server, b'{"texts": ["a"]}', {})[0] == 401
    assert _post(server, b'{"texts": []}', TOKEN)[0] == 422


def test_handler_rejects_oversized_body(server):
    # Only the headers are sent: the handler refuses on Content-Length before reading the body.
    # Sending 2 MB raced with that early answer (the server closes, the client gets a broken pipe).
    import http.client
    from urllib.parse import urlparse

    url = urlparse(server)
    conn = http.client.HTTPConnection(url.hostname, url.port, timeout=5)
    conn.putrequest("POST", url.path or "/")
    for name, value in {"Content-Type": "application/json", **TOKEN}.items():
        conn.putheader(name, value)
    conn.putheader("Content-Length", "2000001")
    conn.endheaders()
    response = conn.getresponse()
    assert response.status == 413
    conn.close()


# --- real model ---


@pytest.fixture
def real_model(monkeypatch):
    monkeypatch.setenv("EMBED_MODEL_DIR", str(LOCAL_MODEL))
    core.load_model.cache_clear()
    yield
    core.load_model.cache_clear()


@needs_model
def test_real_model_adds_e5_prefixes(real_model, monkeypatch):
    _, tokenizer, _ = core.load_model()
    seen, original = [], tokenizer.encode_batch
    monkeypatch.setattr(tokenizer, "encode_batch", lambda texts: seen.extend(texts) or original(texts), raising=False)
    core.encode(["samotni seniorzy"], "query")
    core.encode(["samotni seniorzy"], "passage")
    assert seen == ["query: samotni seniorzy", "passage: samotni seniorzy"]


@needs_model
def test_real_model_vectors_are_unit_length_and_meaningful(real_model):
    q = core.encode(["Babcia mieszka sama i jest smutna"], "query")[0]
    related, unrelated = core.encode(
        ["Seniorzy czują się samotni, brakuje im kontaktu z ludźmi", "Brakuje miejsc parkingowych przy szkole"], "passage"
    )
    assert q.shape == (768,) and abs(np.linalg.norm(q) - 1) < 1e-5
    assert q @ related > q @ unrelated + 0.03


@needs_model
def test_real_model_handles_ukrainian(real_model):
    q = core.encode(["Як записатися до сімейного лікаря?"], "query")[0]
    health, other = core.encode(["Przewodnik po polskiej opiece zdrowotnej dla cudzoziemców", "Gra planszowa o urzędach"], "passage")
    assert q @ health > q @ other
