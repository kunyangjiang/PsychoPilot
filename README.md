# PsychoPilot

An evidence-based psychology course for beginners: 6 volumes, 21 stages, 93 lessons (Curriculum v0.5). This repository holds the website: a homepage, volume pages and a lesson page (lesson content is still in preparation).

## Technology

A plain static site in `web/`: HTML, CSS and vanilla JavaScript (canvas drawings in `ink.js`). There is no framework, package manager, dependency or build step. Fonts load from Google Fonts.

| File | Role |
|---|---|
| `web/index.html`, `press.js` | Homepage |
| `web/part.html` | Volume and interest pages (`?p=1`, `?topic=…`) |
| `web/course.html` | Lesson page (`?id=01-01`) |
| `web/curriculum.js` | Curriculum data |
| `web/ink.js`, `web/press.css` | Covers, drawings and styles |

## Run locally

Any static file server works. With Python 3, `serve.py` serves `web/` and tells the browser to check for changes on every load (a plain `python -m http.server` lets the browser keep showing an old copy of a page after the files change):

```bash
python serve.py
```

Then open <http://localhost:8000>.

## Production build

None needed: the files in `web/` are deployed as they are.

## Deployment

Intended for Cloudflare Pages: no framework preset, an empty build command, and `web` as the build output directory, with `main` as the production branch.
