"""Local preview server for web/ (http://localhost:8000).

Same as `python -m http.server 8000 --directory web`, but every response says
`Cache-Control: no-cache`. Without it the browser guesses how long a page stays fresh and can
keep showing an old copy of one lesson address (course.html?id=XX-YY) after the files change.
With it, the browser asks every time; unchanged files come back as a quick 304.
"""
import functools
import http.server
from pathlib import Path


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    root = Path(__file__).resolve().parent / 'web'
    handler = functools.partial(NoCache, directory=str(root))
    with http.server.ThreadingHTTPServer(('', 8000), handler) as server:
        print('Serving web/ at http://localhost:8000')
        server.serve_forever()
