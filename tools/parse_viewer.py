#!/usr/bin/env python3
"""Put the sheet and the parse side by side so a human can judge it.

tools/parse_sheet.py can tell you a sheet reconciles against its own credit
table. It cannot tell you it read the right thing, because a wrong-but-
plausible block that happens to add up is exactly what a checker misses. The
only judge for that is somebody looking at the page.

So: the rendered sheet on the left, every block the parser believes on the
right, and where a verified week exists (data/linkcs/timetable.json) a third
column diffing the two. Nothing is written anywhere. This is a viewer.

Usage:
    python3 tools/parse_viewer.py                       the current Y3-CSE sheet
    python3 tools/parse_viewer.py <sheet.pdf>
    python3 tools/parse_viewer.py --all                 every tagged sheet, one page
    python3 tools/parse_viewer.py <sheet.pdf> --open    and open it
"""
import base64
import collections
import html
import io
import json
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import pdfplumber                                    # noqa: E402
from parse_sheet import DAYS, SHEETS, minutes, parse  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path("/tmp/linkcs-parse-viewer.html")
TRUTH = ROOT / "data" / "linkcs" / "timetable.json"

DAY_START, DAY_END = 8 * 60, 19 * 60      # the sheet's own span
PX_PER_MIN = 1.05


def page_png(path):
    with pdfplumber.open(path) as pdf:
        buf = io.BytesIO()
        pdf.pages[0].to_image(resolution=150).save(buf)
    return base64.b64encode(buf.getvalue()).decode()


def verified_week():
    if not TRUTH.exists():
        return None
    tt = json.loads(TRUTH.read_text())
    return {(tt["days"][d], b["start"], b["end"], b["course"], b["room"], b["kind"], b["group"])
            for d, bs in tt["week"].items() for b in bs}


def column(blocks, day):
    """One day as absolutely-positioned blocks, so the shape matches the sheet."""
    out = []
    for b in sorted((x for x in blocks if x["day"] == day), key=lambda x: x["start"]):
        top = (minutes(b["start"]) - DAY_START) * PX_PER_MIN
        height = max(22, (minutes(b["end"]) - minutes(b["start"])) * PX_PER_MIN - 2)
        g = {0: "", 1: "G1", 2: "G2"}[b["group"]]
        kind = "" if b["kind"] == "lecture" else b["kind"]
        tags = ((f'<span class="tag">{kind}</span>' if kind else "")
                + (f'<span class="grp">{g}</span>' if g else ""))
        out.append(
            f'<div class="blk k-{b["kind"]}" style="top:{top:.0f}px;height:{height:.0f}px">'
            f'<div class="top"><b>{html.escape(b["course"])}</b>{tags}</div>'
            f'<span class="rm">{html.escape(b["room"])} · {b["start"]}-{b["end"]}</span>'
            "</div>")
    return "".join(out)


def hours_axis():
    rows = []
    for m in range(DAY_START, DAY_END + 1, 60):
        top = (m - DAY_START) * PX_PER_MIN
        rows.append(f'<div class="hr" style="top:{top:.0f}px"><span>{m//60}:00</span></div>')
    return "".join(rows)


def sheet_section(path, truth):
    blocks, problems = parse(path)
    got = {(b["day"], b["start"], b["end"], b["course"], b["room"], b["kind"], b["group"])
           for b in blocks}

    if truth is not None and "year3-sem5-btech-cse" in path.name:
        missing, extra = sorted(truth - got), sorted(got - truth)
        if not missing and not extra:
            verdict = ('<p class="ok">EXACT MATCH against the hand-verified week, on day, '
                       'time, course, room, kind and group.</p>')
        else:
            rows = "".join(f"<li>only in the verified week: {html.escape(str(m))}</li>" for m in missing)
            rows += "".join(f"<li>only in the parse: {html.escape(str(e))}</li>" for e in extra)
            verdict = f'<p class="bad">DIFFERS from the verified week</p><ul class="diff">{rows}</ul>'
    else:
        verdict = '<p class="note">No hand-verified week exists for this sheet, so the only check is the credit table.</p>'

    if problems:
        verdict += ('<p class="bad">Credit table disagrees, so nothing would be written:</p><ul class="diff">'
                    + "".join(f"<li>{html.escape(p)}</li>" for p in problems) + "</ul>")
    else:
        verdict += '<p class="ok">Every course reconciles in both groups against the sheet\'s own credit table.</p>'

    cols = "".join(
        f'<div class="day"><h4>{d}</h4><div class="lane">{column(blocks, d)}</div></div>'
        for d in DAYS)

    return f"""
    <section class="sheet">
      <h2>{html.escape(path.name)}</h2>
      <p class="sub">{len(blocks)} blocks read from the file's own table. Nothing here was inferred from the picture.</p>
      {verdict}
      <div class="split">
        <figure><figcaption>the sheet, as published</figcaption>
          <img src="data:image/png;base64,{page_png(path)}" alt="{html.escape(path.name)}">
        </figure>
        <figure><figcaption>what the parser believes</figcaption>
          <div class="week"><div class="axis">{hours_axis()}</div>{cols}</div>
        </figure>
      </div>
    </section>"""


CSS = """
:root { color-scheme: light dark; --bg:#0f1115; --fg:#e8eaf0; --dim:#8a93a6;
        --line:#242a35; --card:#161a22; --ok:#39d98a; --bad:#ff6b6b; }
* { box-sizing: border-box; }
body { margin:0; padding:24px; background:var(--bg); color:var(--fg);
       font:14px/1.5 -apple-system, system-ui, sans-serif; }
h1 { font-size:1.15rem; margin:0 0 4px; }
h2 { font-size:0.95rem; margin:28px 0 2px; font-family:ui-monospace,Menlo,monospace; }
.sub, .note { color:var(--dim); margin:2px 0 10px; }
.ok { color:var(--ok); margin:4px 0; }
.bad { color:var(--bad); margin:4px 0; }
.diff { color:var(--bad); margin:4px 0 10px 18px; font-family:ui-monospace,Menlo,monospace; font-size:12px; }
.split { display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:start; }
figure { margin:0; }
figcaption { color:var(--dim); font-size:12px; margin-bottom:6px; }
img { width:100%; border:1px solid var(--line); border-radius:6px; background:#fff; }
.week { position:relative; display:grid; grid-template-columns:44px repeat(5,1fr);
        gap:4px; border:1px solid var(--line); border-radius:6px; padding:8px;
        background:var(--card); height:735px; }
.axis { position:relative; }
.hr { position:absolute; left:0; right:0; border-top:1px dashed var(--line); }
.hr span { position:absolute; top:-8px; left:0; font-size:10px; color:var(--dim);
           font-family:ui-monospace,Menlo,monospace; }
.day h4 { margin:0 0 4px; font-size:11px; color:var(--dim); font-weight:500;
          text-transform:uppercase; letter-spacing:0.08em; }
.lane { position:relative; height:693px; border-left:1px solid var(--line); }
.blk { position:absolute; left:3px; right:0; border-radius:4px; padding:3px 5px;
       font-size:10.5px; line-height:1.25; overflow:hidden;
       border:1px solid var(--line); background:#1d2430; }
.blk .top { display:flex; align-items:center; gap:4px; }
.blk b { font-family:ui-monospace,Menlo,monospace; font-size:11px; }
.rm { display:block; color:var(--dim); font-family:ui-monospace,Menlo,monospace; font-size:9.5px; }
.tag, .grp { display:inline-block; padding:0 4px;
             border-radius:3px; font-size:9px; font-family:ui-monospace,Menlo,monospace; }
.tag { background:#2b3446; color:#9fb3d9; }
.grp { background:#3a2b46; color:#d9a8ff; }
.k-lab { border-left:3px solid #4b8; }
.k-tut { border-left:3px solid #b84; }
.k-proj { border-left:3px solid #86b; }
@media (max-width:900px) { .split { grid-template-columns:1fr; } }
"""


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    truth = verified_week()

    if "--all" in flags:
        paths = sorted(SHEETS.glob("*.pdf"))
    elif args:
        paths = [pathlib.Path(args[0])]
    else:
        paths = [sorted(SHEETS.glob("*year3-sem5-btech-cse.pdf"))[-1]]

    sections, skipped = [], []
    for p in paths:
        try:
            sections.append(sheet_section(p, truth))
        except LookupError as e:
            skipped.append(f"{p.name}: {e}")

    skip_html = ""
    if skipped:
        skip_html = ('<h2>refused</h2><p class="sub">An untagged sheet has no exact reading, '
                     'so it is not shown rather than shown wrong.</p><ul class="diff">'
                     + "".join(f"<li>{html.escape(s)}</li>" for s in skipped) + "</ul>")

    OUT.write_text(f"""<!doctype html><meta charset="utf-8">
<title>parse viewer</title><style>{CSS}</style>
<h1>Timetable parse, side by side</h1>
<p class="sub">Left is the published sheet. Right is every block read out of that file's own
table structure. Judge them against each other; nothing here writes anything.</p>
{"".join(sections)}{skip_html}""")

    print(f"wrote {OUT}  ({len(sections)} sheet(s), {len(skipped)} refused)")
    if "--open" in flags:
        subprocess.run(["open", str(OUT)])
    return 0


if __name__ == "__main__":
    sys.exit(main())
