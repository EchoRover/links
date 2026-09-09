#!/usr/bin/env python3
"""Resolve every internal link and asset reference. Exit code = broken count.

Pages get moved and files get deleted, and a static site says nothing about
either: a dead href renders as a perfectly normal link that 404s when someone
taps it. This walks every html/js/css/json, pulls out every reference that is
NOT an external URL, and resolves it against the repo the way the browser
will against the deployed site.

Root-relative ("/css/styles.css") resolves from the repo root, which is what
Vercel serves. Anything else resolves from the referring file's directory.
vercel.json rewrites are honoured, so a link to /bus counts as reaching
pages/bus.html.

Usage:  python3 tools/check_links.py
"""
import json
import pathlib
import posixpath
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP = ("http://", "https://", "//", "data:", "mailto:", "tel:", "javascript:", "#")

files = [p for p in ROOT.rglob("*")
         if p.is_file() and ".git" not in p.parts and p.suffix in
         {".html", ".js", ".css", ".json"}]
have = {str(p.relative_to(ROOT)) for p in ROOT.rglob("*") if p.is_file()}

rewrites = {}
vj = ROOT / "vercel.json"
if vj.exists():
    for r in json.loads(vj.read_text()).get("rewrites", []):
        rewrites[r["source"].lstrip("/")] = r["destination"].lstrip("/")

ATTR = re.compile(r'(?:href|src)\s*=\s*["\']([^"\']+)["\']')
# page URLs that live in js as bare strings, e.g. Bus: "/pages/bus.html"
STR = re.compile(r'["\'](/[\w./-]+\.(?:html|js|css|json|pdf|png|jpg|jpeg|webp|svg))["\']')

broken, checked = [], 0
for f in sorted(files):
    rel = str(f.relative_to(ROOT))
    text = f.read_text(errors="ignore")
    refs = set(ATTR.findall(text))
    if f.suffix in {".js", ".json"}:
        refs |= set(STR.findall(text))
    for raw in refs:
        if raw.startswith(SKIP) or not raw.strip():
            continue
        target = raw.split("#")[0].split("?")[0]
        if not target:
            continue
        if target.startswith("/"):
            cand = target.lstrip("/")
        else:
            cand = posixpath.normpath(posixpath.join(posixpath.dirname(rel), target))
        checked += 1
        if cand in have or cand in rewrites and rewrites[cand] in have:
            continue
        # a bare directory link ("/" or "pages/") wants that folder's index
        if cand in ("", ".") and "index.html" in have:
            continue
        if posixpath.join(cand, "index.html") in have:
            continue
        # cleanUrls: /bus may be served as pages/bus.html via a rewrite
        if cand in rewrites and rewrites[cand] in have:
            continue
        broken.append((rel, raw, cand))

if broken:
    print(f"{len(broken)} broken reference(s) out of {checked} checked:")
    for rel, raw, cand in broken:
        print(f"  {rel}\n      {raw!r}  ->  {cand}  (missing)")
else:
    print(f"OK - {checked} internal references, every one resolves")
sys.exit(len(broken))
