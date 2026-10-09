"""Local preview that behaves like GitHub Pages: /privacy serves privacy.html, /tt /ig /yt are folders
that pass the source on, and a missing page gets 404.html.

Usage (from the repo root):  python tools/serve.py [port]   then open http://localhost:8000
"""
import functools
import http.server
import pathlib
import sys

PUBLIC = pathlib.Path(__file__).resolve().parent.parent / "public"


class Handler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path, rest = self.path, ""
        for sep in "?#":
            if sep in path:
                path, tail = path.split(sep, 1)
                rest = sep + tail + rest
        if path != "/" and not pathlib.PurePosixPath(path).suffix and (PUBLIC / (path.strip("/") + ".html")).is_file():
            self.path = path.rstrip("/") + ".html" + rest
        return super().send_head()

    def send_error(self, code, message=None, explain=None):
        page = PUBLIC / "404.html"
        if code != 404 or not page.is_file():
            return super().send_error(code, message, explain)
        body = page.read_bytes()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Handler, directory=str(PUBLIC)))
    print(f"desilon.nl preview on http://localhost:{port}  (Ctrl+C stops it)")
    server.serve_forever()
