# Embeddingi (P3)

Zamiana tekstu na wektor znaczenia dla Matchmakingu. Model `sdadas/mmlw-e5-base` (polski, 768
wymiarów) jako ONNX int8 z przyciętym słownikiem (łacinka i cyrylica). Działa jako funkcja Pythona
na Vercelu, w tym samym projekcie co Next.js. Hugging Face Spaces z serwerem wymagają płatnego
planu, a to rozwiązanie jest darmowe i nie wymaga konta na HF.

```
Next.js /api/match (TS)  →  POST /api/embed (api/embed.py, Python)  →  embedding/core.py
                                   model z GitHub Release embed-model-v1, pobierany do /tmp przy zimnym starcie
```

## API

```bash
curl $EMBED_URL                            # GET: rozgrzanie i stan, bez tokenu
curl -X POST $EMBED_URL -H "X-Embed-Token: $EMBED_TOKEN" -H 'content-type: application/json' \
  -d '{"texts": ["samotni seniorzy"], "kind": "query"}'
# → {"model": "sdadas/mmlw-e5-base", "dim": 768, "vectors": [[0.021, ...]]}
```

- `kind: "query"` dla tekstu od użytkownika, `"passage"` dla opisów innowacji, wyzwań i zgłoszeń.
  Prefiksy `query: ` / `passage: ` wymagane przez model dodaje usługa.
- Wektory mają długość 1: podobieństwo to iloczyn skalarny (w pgvector `1 - (a <=> b)`).
- Do 256 tekstów naraz; ok. 10 ms na zapytanie po rozgrzaniu, zimny start ok. 5 s.

## Zmienne środowiskowe (Vercel, tylko serwer)

| zmienna | opis |
|---|---|
| `EMBED_TOKEN` | wymagany; długi losowy ciąg (`openssl rand -hex 32`), wysyłany w `X-Embed-Token` |
| `EMBED_URL` | dla `/api/match`: `https://<domena>/api/embed`, lokalnie `http://localhost:7860/api/embed` |

## Plik modelu

Model (188 MB) nie mieści się jako plik w repozytorium (limit GitHuba 100 MB), więc jest
załącznikiem do [GitHub Release `embed-model-v1`](https://github.com/DEFALT314/feniks/releases/tag/embed-model-v1).
Funkcja pobiera go przy zimnym starcie i sprawdza sumy SHA-256 zapisane w `embedding/core.py`.
Źródło: [sdadas/mmlw-e5-base](https://huggingface.co/sdadas/mmlw-e5-base), Apache-2.0.

Nowa wersja modelu (P3):
```bash
uv run embedding/export_onnx.py                      # tworzy embedding/model/ (torch tylko na czas eksportu)
gh release create embed-model-v2 embedding/model/{model.onnx,tokenizer.json,MODEL} --latest=false
sha256sum embedding/model/*                          # → MODEL_SHA256 i MODEL_RELEASE_URL w core.py
```

## Lokalnie

`pnpm dev` nie uruchamia Pythona, więc usługa chodzi obok:

```bash
uv venv --python 3.12 embedding/.venv
uv pip install --python embedding/.venv/bin/python -r requirements.txt pytest
EMBED_TOKEN=dev EMBED_MODEL_DIR=embedding/model embedding/.venv/bin/python -m embedding.serve
embedding/.venv/bin/python -m pytest -q embedding    # testy (część na prawdziwym modelu)
```

## Konfiguracja Vercel (P4)

Funkcja Pythona dołącza domyślnie wszystkie pliki projektu. Żeby nie przekroczyć limitu 500 MB,
w `vercel.json` potrzebny jest wpis (do dodania przez P4):

```json
"functions": {
  "api/embed.py": {
    "excludeFiles": "{node_modules/**,.next/**,app/**,components/**,lib/**,design/**,docs/**,pitch/**,data/**,supabase/**,scripts/**,public/**,embedding/model/**,embedding/.venv/**,embedding/test_*.py}"
  }
}
```

Rozgrzewanie: `GET /api/embed` co 10 minut z crona (`app/api/cron/`, P4).
