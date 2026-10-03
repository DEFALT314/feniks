"""Tests for catalog chunking and the Supabase upload (no network, no database)."""

import json
from collections import Counter

import numpy as np

from embedding.catalog import Chunk, area_chunks, catalog_chunks, innovation_chunks, is_for_matchmaking
from embedding.upload import SupabaseRest, rows, to_pgvector, upload

ITEM = {
    "id": "bawita",
    "nazwa": "BaWita",
    "opis_krotki": "Tablica do ćwiczenia pamięci.",
    "problem": "Mało narzędzi dla dorosłych z otępieniem.",
    "dla_kogo": ["seniorzy z demencją", "osoby po udarze"],
    "slowa_kluczowe": ["demencja", "pamięć"],
    "przyklady_zapytan": ["Mama ma demencję, czym ćwiczyć pamięć?"],
}


def test_innovation_chunks_cover_each_aspect_and_plain_queries():
    chunks = innovation_chunks(ITEM, ["Babcia zapomina słowa"])
    assert [c.chunk_type for c in chunks] == ["full", "problem", "summary", "audience", "audience", "keywords", "plain"]
    assert [c.chunk for c in chunks] == list(range(7))
    assert all(c.kind == "innovation" and c.ref_id == "bawita" for c in chunks)


def test_test_set_sentences_are_never_embedded():
    text = " ".join(c.content for c in innovation_chunks(ITEM))
    assert "Mama ma demencję" not in text


def test_missing_fields_do_not_create_empty_chunks():
    chunks = innovation_chunks({"id": "x", "nazwa": "X", "opis_krotki": None, "dla_kogo": [], "slowa_kluczowe": []})
    assert [(c.chunk_type, c.content) for c in chunks] == [("full", "X")]


def test_outside_library_items_need_a_complete_description():
    assert is_for_matchmaking({"pewnosc": "pewne"}, outside_library=True)
    assert not is_for_matchmaking({"pewnosc": "prawdopodobne"}, outside_library=True)
    assert is_for_matchmaking({"pewnosc": "prawdopodobne", "do_matchmakingu": True}, outside_library=True)
    assert is_for_matchmaking({}, outside_library=False)


def test_area_and_challenge_chunks():
    area = {"id": "seniorzy", "nazwa": "Seniorzy", "definicja": "Osoby 60+.", "slowa_kluczowe": ["starość"],
            "kluczowe_wyzwania": [{"id": "samotnosc", "tekst": "Samotność seniorów"}]}
    chunks = area_chunks(area)
    assert [(c.kind, c.ref_id) for c in chunks] == [("area", "seniorzy"), ("challenge", "samotnosc")]
    assert chunks[1].content == "Seniorzy: Samotność seniorów"


def test_catalog_matches_the_issue_counts():
    items = {(c.kind, c.ref_id) for c in catalog_chunks()}
    assert Counter(k for k, _ in items) == {"innovation": 124, "challenge": 48, "area": 8}


def test_every_matchmaking_innovation_has_plain_queries():
    from embedding.catalog import load_plain_queries

    plain = load_plain_queries()
    innovations = {c.ref_id for c in catalog_chunks() if c.kind == "innovation"}
    assert innovations <= set(plain), sorted(innovations - set(plain))


# --- upload ---


class FakeDb(SupabaseRest):
    def __init__(self):
        self.calls = []

    def request(self, method, path, body=None, prefer=None):
        self.calls.append((method, path, body, prefer))


def test_pgvector_text_format():
    assert to_pgvector(np.array([0.5, -0.25])) == "[0.500000,-0.250000]"


def test_upload_upserts_in_batches_then_removes_stale_rows():
    chunks = [Chunk("innovation", f"i{n}", 0, "full", "t") for n in range(450)] + [Chunk("area", "a", 0, "area", "t")]
    db = FakeDb()
    result = upload(db, chunks, np.zeros((451, 2)), "m")
    posts = [c for c in db.calls if c[0] == "POST"]
    assert [len(c[2]) for c in posts] == [200, 200, 51]
    assert all(c[1] == "embeddings?on_conflict=kind,ref_id,chunk" and "merge-duplicates" in c[3] for c in posts)
    deletes = [c[1] for c in db.calls if c[0] == "DELETE"]
    assert "embeddings?kind=eq.area&ref_id=not.in.(%22a%22)" in deletes
    assert "embeddings?kind=eq.innovation&ref_id=eq.i0&chunk=gte.1" in deletes
    assert db.calls.index(posts[-1]) < db.calls.index(next(c for c in db.calls if c[0] == "DELETE"))
    assert result == {"rows": 451, "items": 451}


def test_rows_carry_model_and_content():
    [row] = rows([Chunk("challenge", "c", 0, "challenge", "Seniorzy: X")], np.array([[1.0]]), "sdadas/mmlw-e5-base")
    assert row == {"kind": "challenge", "ref_id": "c", "chunk": 0, "chunk_type": "challenge",
                   "content": "Seniorzy: X", "embedding": "[1.000000]", "model": "sdadas/mmlw-e5-base"}


def test_rest_client_sends_service_key_headers():
    seen = {}

    class Response:
        def __enter__(self): return self
        def __exit__(self, *a): pass
        def read(self): return b"[]"

    def opener(request, timeout):
        seen.update(dict(request.header_items()), method=request.get_method(), url=request.full_url,
                    body=json.loads(request.data))
        return Response()

    SupabaseRest("https://x.supabase.co/", "svc", opener).request("POST", "embeddings", [{"a": 1}], prefer="p")
    assert seen["url"] == "https://x.supabase.co/rest/v1/embeddings" and seen["method"] == "POST"
    assert seen["Apikey"] == "svc" and seen["Authorization"] == "Bearer svc" and seen["Prefer"] == "p"
