"""
build-pages.py
Builds index.html (the GitHub Pages copy) from src/demo.html.

src/demo.html is written as page content only, the way the Claude artifact
viewer expects (it adds the <html>/<head>/<body> wrapper itself). GitHub
Pages serves files as-is, so this script adds that wrapper: everything before
the first <div> (title, fonts, styles) goes in <head>, the rest in <body>.

Run from the repository root:  python3 scripts/build-pages.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
source = (ROOT / "src" / "demo.html").read_text(encoding="utf-8")

# The page content starts at the demo banner; everything above it is head material.
split_at = source.index('<div class="demo-bar">')
head, body = source[:split_at], source[split_at:]

page = (
    "<!doctype html>\n<html lang=\"en\">\n<head>\n"
    "<meta charset=\"utf-8\">\n"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
    "<meta name=\"robots\" content=\"noindex\">\n"
    # The same small reset the artifact viewer adds around the page.
    "<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);"
    "padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}"
    "img{max-width:100%}[hidden]{display:none!important}</style>\n"
    + head + "</head>\n<body>\n" + body + "\n</body>\n</html>\n"
)
(ROOT / "index.html").write_text(page, encoding="utf-8")
print("Wrote index.html (%d bytes)" % len(page))
