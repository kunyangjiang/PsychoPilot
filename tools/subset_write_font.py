"""Build web/fonts/wenkai-write.woff2: the 楷体 used for written text in the case novellas.

Phones (iOS, Android) have no 楷体 that web pages can use, so the site ships its own copy of
LXGW WenKai Screen (霞鹜文楷 屏幕阅读版, SIL Open Font License 1.1). The full font is 26 MB, so this
script keeps only the characters that actually appear inside written text in web/cases/*.html
(<div class="l-letter"> and <i class="l-w">), plus ASCII and common Chinese punctuation.

Run it again after adding or editing written text in any case:
    python -m pip install fonttools brotli
    python tools/subset_write_font.py path/to/LXGWWenKaiScreen.ttf
Font download: https://github.com/lxgw/LxgwWenKai-Screen/releases
"""
import html
import pathlib
import re
import sys

from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent.parent
CASES = ROOT / 'web' / 'cases'
OUT = ROOT / 'web' / 'fonts' / 'wenkai-write.woff2'

BLOCKS = [
    re.compile(r'<div class="l-letter[^"]*">(.*?)</div>', re.S),
    re.compile(r'<i class="l-w">(.*?)</i>', re.S),
]
EXTRA = ''.join(chr(c) for c in range(0x20, 0x7F)) + '，。、；：？！“”‘’（）《》〈〉【】—…·～　'


def written_text():
    chars = set(EXTRA)
    for page in sorted(CASES.glob('*.html')):
        src = page.read_text(encoding='utf-8')
        for rx in BLOCKS:
            for m in rx.finditer(src):
                chars.update(html.unescape(re.sub(r'<[^>]+>', '', m.group(1))))
    chars.discard('\n'); chars.discard('\r'); chars.discard('\t')
    return ''.join(sorted(chars))


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    text = written_text()
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']          # keep the copyright and licence records
    opts.notdef_outline = True
    font = subset.load_font(sys.argv[1], opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    missing = [c for c in text if ord(c) not in font.getBestCmap()]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    subset.save_font(font, str(OUT), opts)
    print(f'{len(text)} characters -> {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)')
    if missing:
        print('not in the font:', ''.join(missing))


if __name__ == '__main__':
    main()
