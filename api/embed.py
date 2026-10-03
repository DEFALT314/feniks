"""Vercel Python function: text → embedding vectors (owner: P3).

    GET  /api/embed   warm-up and status, no token
    POST /api/embed   {"texts": [...], "kind": "query" | "passage"} → {"model", "dim", "vectors"}
                      header X-Embed-Token: <EMBED_TOKEN>

Plain BaseHTTPRequestHandler on purpose: a Python web framework in requirements.txt would make
Vercel treat the whole project as that framework instead of Next.js. Logic lives in embedding/core.py.
"""

import json
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from embedding.core import handle_embed, handle_health  # noqa: E402

MAX_BODY = 2_000_000


class handler(BaseHTTPRequestHandler):  # noqa: N801 – Vercel requires this exact name
    def _send(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # noqa: N802
        self._send(*handle_health())

    def do_POST(self):  # noqa: N802
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            self._send(413, {"error": "request too large"})
            return
        self._send(*handle_embed(self.headers, self.rfile.read(length)))

    def log_message(self, *args):  # keep request bodies and tokens out of logs
        pass
