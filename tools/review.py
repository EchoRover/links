#!/usr/bin/env python3
"""Show a parsed sheet the way the sheet itself is laid out, for eyeballing.

Horizontal on purpose: days down the side, time across the top, exactly like
the published grid. A vertical week reads better on a phone but it cannot be
compared against the source without translating in your head, and the whole
job of this page is comparison.

Blocks that arithmetic determined are plain. Blocks belonging to a course the
credit table could NOT determine are marked, because those are the only ones
worth a human's attention.

    python3 tools/review.py                     both Year 3 sheets
    python3 tools/review.py <a.pdf> <b.pdf>     any sheets
    python3 tools/review.py --all
"""
import base64
import collections
import html
import io
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import pdfplumber                                        # noqa: E402
from parse_sheet import DAYS, SHEETS, minutes, parse     # noqa: E402

OUT = pathlib.Path("/tmp/linkcs-review.html")
T0, T1 = 8 * 60, 19 * 60          # the span the sheets themselves print
LANE_H = 30


def sheet_png(path):
    with pdfplumber.open(path) as pdf:
        buf = io.BytesIO()
        pdf.pages[0].to_image(resolution=170).save(buf)
    return base64.b64encode(buf.getvalue()).decode()


def lanes(blocks):
    """Stack overlapping blocks so nothing hides behind anything else."""
    out = []
    for b in sorted(blocks, key=lambda x: (minutes(x["start"]), x["end"])):
        for i, lane in enumerate(out):
            if all(minutes(b["start"]) >= minutes(o["end"]) or
                   minutes(o["start"]) >= minutes(b["end"]) for o in lane):
                lane.append(b)
                break
        else:
            out.append([b])
    return out


def day_row(day, blocks):
    rows = lanes([b for b in blocks if b["day"] == day]) or [[]]
    body = ""
    for lane in rows:
        cells = ""
        for b in lane:
            left = (minutes(b["start"]) - T0) / (T1 - T0) * 100
            width = (minutes(b["end"]) - minutes(b["start"])) / (T1 - T0) * 100
            g = {0: "", 1: "G1", 2: "G2"}[b["group"]]
            kind = "" if b["kind"] == "lecture" else b["kind"]
            flag = "" if b.get("resolved") == "forced" else " un"
            cells += (
                f'<div class="b k-{b["kind"]}{flag}" style="left:{left:.3f}%;width:{width:.3f}%" '
                f'title="{html.escape(b["text"])}">'
                # ORDER MATTERS. A 50-minute block is about 7% of the width and
                # clips, so the things being checked (kind, group) come before the
                # room, which is the one that can afford to be cut.
                f'<b>{html.escape(b["course"])}</b>'
                + (f'<u>{kind}</u>' if kind else "")
                + (f'<s>{g}</s>' if g else "")
                + f'<i>{html.escape(b["room"])}</i>'
                + "</div>")
        body += f'<div class="lane">{cells}</div>'
    return f'<div class="row"><div class="dayname">{day[:3]}</div><div class="lanes">{body}</div></div>'


def ruler():
    marks = ""
    for m in range(T0, T1 + 1, 60):
        left = (m - T0) / (T1 - T0) * 100
        marks += f'<span style="left:{left:.3f}%">{m // 60}</span>'
    return f'<div class="row"><div class="dayname"></div><div class="ruler">{marks}</div></div>'


def section(path):
    try:
        blocks, unresolved = parse(path)
    except LookupError as e:
        return (f'<section><h2>{html.escape(path.name)}</h2>'
                f'<p class="bad">refused: {html.escape(str(e))}</p></section>')

    forced = sum(1 for b in blocks if b.get("resolved") == "forced")
    note = (f'<p class="ok">all {len(blocks)} blocks determined by arithmetic alone</p>'
            if not unresolved else
            '<p class="bad">' + "<br>".join(
                f'{html.escape(u["course"])}: {html.escape(u["why"])}' for u in unresolved)
            + '</p>')

    grid = ruler() + "".join(day_row(d, blocks) for d in DAYS)
    return f"""<section>
      <h2>{html.escape(path.name)}</h2>
      <p class="sub">{len(blocks)} blocks · {forced} forced · hover any block for the raw cell text</p>
      {note}
      <div class="grid">{grid}</div>
      <details><summary>the published sheet</summary>
        <img src="data:image/png;base64,{sheet_png(path)}"></details>
    </section>"""


CSS = """
:root { color-scheme: dark; --bg:#0e1116; --fg:#e9ecf2; --dim:#8b94a7; --line:#232a36;
        --card:#161b24; --ok:#3fd18b; --bad:#ff7a7a; }
*{box-sizing:border-box} body{margin:0;padding:22px;background:var(--bg);color:var(--fg);
  font:13px/1.45 -apple-system,system-ui,sans-serif}
h1{font-size:1.1rem;margin:0 0 16px} h2{font-size:.9rem;margin:26px 0 2px;
  font-family:ui-monospace,Menlo,monospace}
.sub{color:var(--dim);margin:2px 0 6px} .ok{color:var(--ok);margin:2px 0 10px}
.bad{color:var(--bad);margin:2px 0 10px}
.grid{border:1px solid var(--line);border-radius:8px;background:var(--card);padding:8px 10px}
.row{display:flex;align-items:stretch;border-top:1px solid var(--line)}
.row:first-child{border-top:0}
.dayname{width:38px;flex:none;color:var(--dim);font-family:ui-monospace,Menlo,monospace;
  font-size:10px;text-transform:uppercase;padding-top:7px}
.lanes{flex:1;min-width:0;padding:3px 0}
.ruler{flex:1;position:relative;height:16px}
.ruler span{position:absolute;top:2px;font-size:9.5px;color:var(--dim);
  font-family:ui-monospace,Menlo,monospace;transform:translateX(-50%)}
.lane{position:relative;height:LANEHpx;margin:2px 0}
.b{position:absolute;top:0;bottom:0;border-radius:3px;background:#1e2634;
  border:1px solid var(--line);padding:2px 5px;overflow:hidden;white-space:nowrap;
  display:flex;align-items:center;gap:5px}
.b b{font-family:ui-monospace,Menlo,monospace;font-size:10.5px;flex:none}
.b i{font-style:normal;color:var(--dim);font-family:ui-monospace,Menlo,monospace;font-size:9px;min-width:0;overflow:hidden}
.b u{text-decoration:none;background:#2b3446;color:#9fb3d9;border-radius:2px;padding:0 4px;font-size:9px;flex:none}
.b s{text-decoration:none;background:#3a2b46;color:#d9a8ff;border-radius:2px;padding:0 4px;font-size:9px;flex:none}
.k-lab{border-left:3px solid #3fae7d} .k-tut{border-left:3px solid #c08a3e}
.k-proj{border-left:3px solid #8a6bc0}
.b.un{outline:1px dashed var(--bad);outline-offset:-1px}
details{margin-top:8px} summary{color:var(--dim);cursor:pointer;font-size:12px}
img{width:100%;margin-top:8px;border:1px solid var(--line);border-radius:6px;background:#fff}
""".replace("LANEH", str(LANE_H))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--all" in sys.argv:
        paths = sorted(SHEETS.glob("*.pdf"))
    elif args:
        paths = [pathlib.Path(a) for a in args]
    else:
        paths = [sorted(SHEETS.glob("*year3-sem5-btech-cse.pdf"))[-1],
                 sorted(SHEETS.glob("*year3-sem5-btech-een.pdf"))[-1]]

    OUT.write_text(f"""<!doctype html><meta charset="utf-8"><title>parse review</title>
<style>{CSS}</style>
<h1>Parsed sheets, laid out like the sheets</h1>
<p class="sub">Days down the side, time across the top, same as the published grid.
A dashed red outline means the credit table could not determine that course.
Open "the published sheet" under any grid to compare.</p>
{"".join(section(p) for p in paths)}""")
    print(f"wrote {OUT}  ({len(paths)} sheets)")
    subprocess.run(["open", str(OUT)])


if __name__ == "__main__":
    main()
