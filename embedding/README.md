# Embeddings (P3)

Turns text into a meaning vector for Matchmaking. Model `sdadas/mmlw-e5-base` (Polish, 768
dimensions) as int8 ONNX with a trimmed vocabulary (Latin and Cyrillic). Runs as a Python function
on Vercel, in the same project as Next.js. Hugging Face Spaces with a server need a paid plan;
this setup is free and needs no HF account.

```
Next.js /api/match (TS)  →  POST /api/embed (api/embed.py, Python)  →  embedding/core.py
                                   model from GitHub Release embed-model-v1, downloaded to /tmp on cold start
```

## API

```bash
curl $EMBED_URL                            # GET: warm-up and status, no token
curl -X POST $EMBED_URL -H "X-Embed-Token: $EMBED_TOKEN" -H 'content-type: application/json' \
  -d '{"texts": ["samotni seniorzy"], "kind": "query"}'
# → {"model": "sdadas/mmlw-e5-base", "dim": 768, "vectors": [[0.021, ...]]}
```

- `kind: "query"` for user text, `"passage"` for descriptions of innovations, challenges and submissions.
  The service adds the `query: ` / `passage: ` prefixes the model requires.
- Vectors have length 1: similarity is the dot product (in pgvector `1 - (a <=> b)`).
- Up to 256 texts at once; about 10 ms per query once warm. Cold start = downloading 197 MB from GitHub
  + loading (locally on a 6 MB/s link: 31 s; on Vercel still to be measured on a preview).

## Environment variables (Vercel, server only)

| variable | description |
|---|---|
| `EMBED_TOKEN` | required; a long random string (`openssl rand -hex 32`), sent in `X-Embed-Token` |
| `EMBED_URL` | for `/api/match`: `https://<domain>/api/embed`, locally `http://localhost:7860/api/embed` |

## Model file

The model (188 MB) doesn't fit as a file in the repository (GitHub's 100 MB limit), so it is
an asset of [GitHub Release `embed-model-v1`](https://github.com/DEFALT314/feniks/releases/tag/embed-model-v1).
The function downloads it on cold start and checks the SHA-256 sums stored in `embedding/core.py`.
Source: [sdadas/mmlw-e5-base](https://huggingface.co/sdadas/mmlw-e5-base), Apache-2.0.

New model version (P3):
```bash
uv run embedding/export_onnx.py                      # creates embedding/model/ (torch only during export)
gh release create embed-model-v2 embedding/model/{model.onnx,tokenizer.json,MODEL} --latest=false
sha256sum embedding/model/*                          # → MODEL_SHA256 and MODEL_RELEASE_URL in core.py
```

## Locally

`pnpm dev` doesn't run Python, so the service runs alongside it:

```bash
uv venv --python 3.12 embedding/.venv
uv pip install --python embedding/.venv/bin/python -r requirements.txt pytest
EMBED_TOKEN=dev EMBED_MODEL_DIR=embedding/model embedding/.venv/bin/python -m embedding.serve
embedding/.venv/bin/python -m pytest -q embedding    # tests (some on the real model)
```

## Vercel configuration (P4)

A Python function bundles all project files by default. To stay under the 500 MB limit,
`vercel.json` needs this entry (to be added by P4):

```json
"functions": {
  "api/embed.py": {
    "excludeFiles": "{node_modules/**,.next/**,app/**,components/**,lib/**,design/**,docs/**,pitch/**,data/**,supabase/**,scripts/**,public/**,embedding/model/**,embedding/.venv/**,embedding/test_*.py}"
  }
}
```

Warm-up: `GET /api/embed` every 10 minutes from a cron (`app/api/cron/`, P4).

## Catalog vectors in the database

`scripts/embed.py` computes vectors for 124 innovations (several chunks each, together with plain-language
sentences from `data/derived/plain_queries.json`), 8 areas and 48 challenges and stores them in `public.embeddings`
(migration `202610031900_ai_tables.sql`). Search: the function `match_embeddings(query, match_kind, match_count)`;
an innovation scores by its best chunk. The script first upserts, then deletes stale rows,
so search keeps working while it refreshes.

```bash
EMBED_MODEL_DIR=embedding/model embedding/.venv/bin/python scripts/embed.py --dry-run
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... EMBED_MODEL_DIR=embedding/model \
  embedding/.venv/bin/python scripts/embed.py
```
