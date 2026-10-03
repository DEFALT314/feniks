"""Local development server with the same handler as the Vercel function.

    EMBED_TOKEN=dev EMBED_MODEL_DIR=embedding/model python -m embedding.serve   # from the repo root
Then set EMBED_URL=http://localhost:7860/api/embed for the Next.js app (pnpm dev does not run Python).
"""

import os
from http.server import ThreadingHTTPServer

from api.embed import handler

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "7860"))
    print(f"embedding service on http://localhost:{port}/api/embed")
    ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
