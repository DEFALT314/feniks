"""Compute catalog vectors and store them in Supabase (table public.embeddings).

    # dry run: compute and print counts, write nothing
    EMBED_MODEL_DIR=embedding/model embedding/.venv/bin/python scripts/embed.py --dry-run
    # upload (service key allowed in scripts, CLAUDE.md rule 3)
    NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
      EMBED_MODEL_DIR=embedding/model embedding/.venv/bin/python scripts/embed.py

Source: the data/rops files, filtered like P1's seed (124 innovations = 115 from the Library +
9 complete ones from outside it, 8 areas, 48 challenges). Rerun after changing the catalog,
data/derived/plain_queries.json or the model. Without EMBED_MODEL_DIR the model is downloaded
from the GitHub release (see embedding/README.md).
"""

import argparse
import os
import sys
import time
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from embedding.catalog import catalog_chunks  # noqa: E402
from embedding.core import encode, load_model  # noqa: E402
from embedding.upload import SupabaseRest, upload  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--dry-run", action="store_true", help="compute vectors, write nothing")
    args = parser.parse_args()

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not args.dry_run and not (url and key):
        sys.exit("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or use --dry-run.")

    chunks = catalog_chunks()
    counts = Counter(c.kind for c in chunks)
    items = Counter(c.kind for c in {(c.kind, c.ref_id): c for c in chunks}.values())
    print(f"{len(chunks)} chunks: " + ", ".join(f"{items[k]} {k} ({counts[k]} chunks)" for k in sorted(counts)))

    started = time.time()
    model = load_model()[0]
    vectors = encode([c.content for c in chunks], "passage")
    print(f"vectors: {vectors.shape} with {model} in {time.time() - started:.0f} s")

    if args.dry_run:
        print("dry run: nothing written")
        return
    result = upload(SupabaseRest(url, key), chunks, vectors, model)
    print(f"uploaded {result['rows']} rows for {result['items']} items")


if __name__ == "__main__":
    main()
