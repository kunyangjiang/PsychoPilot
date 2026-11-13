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

## Cases v0.4 Roadmap

Original psychology novellas, each followed by Case Notes, read through `web/case.html?id=cN`. A case is added to `web/cases.js` only when its page is written and approved.

| Case | Title | Primary genre | Status |
|---|---|---|---|
| 01 | 第七份证词 | Forensic / criminal mystery | Published |
| 02 | 夜班 | Psychiatric medical ensemble | Published |
| 03 | 完美公司的秘密 | Corporate psychological thriller | Published |
| 04 | 消失的显著性 | Academic mystery | Published |
| 05 | 无限滚动 | Technological psychological horror | Published |
| 06 | 第三考场 | Coming-of-age / educational drama | Published |
| 07 | 情书算法 | Contemporary romance | Published |
| 08 | 测量心灵的人 | Historical psychological fiction | Published |
| 09 | 全镇最烂的话剧团 | British ensemble farce | In development |
| 10 | 第七夜的客人 | Japanese supernatural horror | Planned |
| 11 | 泥地 | Brazilian sports drama and comedy | Planned |
| 12 | 愿望只能买半个 | Dark comic fantasy adventure | Planned |
| 13 | 城里没有妖怪 | Historical Chinese folk horror | Planned |
| 14 | 表情说明书 | Alien science-fiction comedy | Planned |
| 15 | 她回来的三天 | Mexican magical realism | Planned |
| 16 | 一杆秤 | Chinese social realism | Planned |
| 17 | 最后一道菜不能上 | French culinary family comedy | Planned |
| 18 | 海底没有星星 | Cosmic horror | Planned |
| 19 | 皇帝决定当普通人 | Ancient Chinese political satire | Planned |
| 20 | 笑声传过山谷 | Historical African social drama | Planned |
| 21 | 人民公园的星期六 | Late-life romantic comedy | Planned |
| 22 | 第二只手 | Italian psychological body horror | Planned |
| 23 | 雪线以上还有一个人 | Karakoram survival adventure | Planned |

Special editorial refinements:

- **Case 09:** a sustained comedy mechanism, and real consequences for the characters after the performance.
- **Case 12:** magic can only take away, never give.
- **Case 14:** facial expressions are interpreted from context, not read by any special emotion-recognition ability.
- **Case 20:** local cultural explanations are respected, but kept distinct from medical evidence.

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
