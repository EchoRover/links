# Timetable sheets

Every official timetable PDF the college has issued this semester, kept
here because two things on the site are derived from them and neither is
reproducible without the source:

* `js/timetable.js` — the Sem 5 CSE grid behind the home page's
  current/next class card.
* `data/campus-tools-data.js` — the course/faculty legend from all
  eleven sheets, behind Campus Tools.

The site links the current Sem 5 CSE sheet directly (`index.html`,
`js/scripts.js`), so these are served, not just archived.

## Naming: files are named by REVISION date, not by mail date

`YYYY-MM-DD-<year>-<sem>-<programme>-<branch>.pdf`, where the date is the
one stamped in the sheet's own footer.

**This matters and it has already bitten once.** The college mailed a set
of eleven sheets with `29th August` in every filename. All eleven carry
`27th August 2026 - 5:30pm` in the footer — they are the 27 August
revision re-sent, not a new one. A cell-by-cell recheck of the Sem 5 sheet
on 2026-09-01 confirmed zero changes against what `timetable.js` already
held.

So: the date in a filename is when it was mailed. The date in the footer
is the revision. Name by the footer, and before transcribing anything,
check the footer first — it is the cheapest possible way to find out that
a "new" timetable is not new.

## Before you trust a new sheet

Run the reconciliation. It compares the transcribed grid against the
L-T-P-C credit table the same sheet prints, which is the half of the
document nobody transcribes and is therefore free to be used as a check:

    python3 tools/check_timetable.py                # newest Sem 5 CSE sheet
    python3 tools/check_timetable.py <some.pdf>     # a specific one

It exits non-zero on a mismatch. When it fails, suspect the transcription
before you suspect the check — the two times this fired it was right both
times, most notably on Tuesday's unlabelled 110-minute computer-lab block,
which reads as a lecture every single time you look at it and is actually
ACOL333's two practical hours.

## Current set

| File | Revision | Notes |
|---|---|---|
| `2026-08-23-year3-sem5-btech-cse.pdf` | 23 Aug | superseded, kept for diffing |
| `2026-08-27-*.pdf` (11 sheets) | 27 Aug | current; mailed 29 Aug |

The two MTECH-ETS sheets print no footer stamp at all; they are grouped
with the 27 August set because they arrived in that mail.
