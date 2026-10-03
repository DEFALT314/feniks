---
title: HubMI Embeddings
emoji: 🔎
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# HubMI – usługa embeddingów

Zamienia tekst na wektor znaczenia dla Matchmakingu (moduł I). Model `sdadas/mmlw-e5-base`
(polski, 768 wymiarów) w wersji ONNX int8 z przyciętym słownikiem (łacinka i cyrylica).
Właściciel: P3.

## API

```bash
curl $EMBED_URL/health                      # rozgrzanie, bez tokenu
curl -X POST $EMBED_URL/embed \
  -H "Authorization: Bearer $EMBED_TOKEN" -H 'content-type: application/json' \
  -d '{"texts": ["samotni seniorzy"], "kind": "query"}'
# → {"model": "sdadas/mmlw-e5-base", "dim": 768, "vectors": [[0.021, ...]]}
```

- `kind: "query"` dla tekstu od użytkownika, `"passage"` dla opisów innowacji, wyzwań i zgłoszeń.
  Usługa sama dodaje prefiksy `query: ` / `passage: ` wymagane przez model.
- Wektory mają długość 1, więc podobieństwo to iloczyn skalarny (w pgvector: `1 - (a <=> b)`).
- Do 256 tekstów w jednym zapytaniu; jedno zapytanie ok. 10 ms na CPU po rozgrzaniu.

## Wdrożenie (prywatny Space)

1. Na huggingface.co: **New Space**, SDK **Docker**, sprzęt **CPU basic**, widoczność **Private**.
2. W ustawieniach Space → **Variables and secrets** dodaj sekret `EMBED_TOKEN` (długi losowy ciąg).
3. Wgraj zawartość tego folderu (bez `model/` i `.venv/`):
   ```bash
   git clone https://huggingface.co/spaces/<konto>/hubmi-embed && cd hubmi-embed
   cp ../feniks/hf-space/{app.py,export_onnx.py,Dockerfile,requirements*.txt,README.md,.dockerignore} .
   git add . && git commit -m "Usługa embeddingów" && git push
   ```
   Pierwsze budowanie trwa kilka minut: obraz sam pobiera model i robi z niego plik ONNX
   (plik ma ok. 190 MB, więc nie trzymamy go w repozytorium na GitHubie).
4. W Vercelu ustaw `EMBED_URL=https://<konto>-hubmi-embed.hf.space` i `EMBED_TOKEN`.
   Prywatny Space wymaga też tokenu Hugging Face: `HF_TOKEN` (odczyt), wysyłany jako
   `Authorization: Bearer` przez proxy Space; `EMBED_TOKEN` idzie wtedy w nagłówku `X-Embed-Token`.

Darmowy Space zasypia po braku ruchu. Rozgrzewanie: `GET /health` co 10 minut z crona Vercel
(`app/api/cron/`, konfiguracja P4) i ręcznie przed pokazem.

## Lokalnie

```bash
cd hf-space
uv venv --python 3.12 .venv && uv pip install --python .venv/bin/python -r requirements.txt pytest httpx
uv run export_onnx.py                       # tworzy model/ (torch tylko na czas eksportu)
EMBED_TOKEN=dev .venv/bin/uvicorn app:app --port 7860
.venv/bin/python -m pytest -q               # testy (część na prawdziwym modelu)
```
