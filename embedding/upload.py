"""Write catalog vectors to Supabase (table public.embeddings) through the REST API.

Upserts first, then removes rows that no longer exist, so the table is never empty during a
refresh and searches keep working while the script runs.
"""

import json
import urllib.parse
import urllib.request
from collections import defaultdict

import numpy as np

from .catalog import Chunk

BATCH = 200


class SupabaseRest:
    def __init__(self, url: str, service_key: str, opener=urllib.request.urlopen):
        self.base = url.rstrip("/") + "/rest/v1"
        self.key = service_key
        self.opener = opener

    def request(self, method: str, path: str, body=None, prefer: str | None = None):
        headers = {"apikey": self.key, "Authorization": f"Bearer {self.key}", "Content-Type": "application/json"}
        if prefer:
            headers["Prefer"] = prefer
        data = None if body is None else json.dumps(body).encode()
        request = urllib.request.Request(f"{self.base}/{path}", data=data, method=method, headers=headers)
        with self.opener(request, timeout=60) as response:
            raw = response.read()
        return json.loads(raw) if raw else None


def to_pgvector(v: np.ndarray) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"


def rows(chunks: list[Chunk], vectors: np.ndarray, model: str) -> list[dict]:
    return [
        {
            "kind": c.kind,
            "ref_id": c.ref_id,
            "chunk": c.chunk,
            "chunk_type": c.chunk_type,
            "content": c.content,
            "embedding": to_pgvector(v),
            "model": model,
        }
        for c, v in zip(chunks, vectors)
    ]


def upload(db: SupabaseRest, chunks: list[Chunk], vectors: np.ndarray, model: str) -> dict:
    data = rows(chunks, vectors, model)
    for start in range(0, len(data), BATCH):
        db.request(
            "POST",
            "embeddings?on_conflict=kind,ref_id,chunk",
            data[start : start + BATCH],
            prefer="resolution=merge-duplicates,return=minimal",
        )

    # Remove stale rows: items that disappeared, and extra chunks of items that now have fewer.
    per_item: dict[tuple[str, str], int] = defaultdict(int)
    for c in chunks:
        per_item[(c.kind, c.ref_id)] = max(per_item[(c.kind, c.ref_id)], c.chunk + 1)
    for kind in sorted({k for k, _ in per_item}):
        ids = ",".join(f'"{ref}"' for k, ref in sorted(per_item) if k == kind)
        db.request("DELETE", f"embeddings?kind=eq.{kind}&ref_id=not.in.({urllib.parse.quote(ids)})")
    for (kind, ref), count in sorted(per_item.items()):
        db.request("DELETE", f"embeddings?kind=eq.{kind}&ref_id=eq.{urllib.parse.quote(ref)}&chunk=gte.{count}")
    return {"rows": len(data), "items": len(per_item)}
