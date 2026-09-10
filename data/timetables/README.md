# Timetable sheets

The CURRENT revision of every cohort's timetable, one file each. Superseded
revisions are not kept: they were being read as if they were current, and git
holds them anyway if a revision history is ever needed.

The site links the Sem 5 CSE sheet directly (`js/scripts.js`, `pages/week.html`),
so these are served, not just archived. `data/linkcs/timetable.json` is derived
from the Sem 5 CSE sheet and checked back against it by
`tools/check_timetable.py`.

Two sheets carry NO footer stamp (both MTech ETS), so those two are dated by
the server's Last-Modified header instead. That is a weaker fact than a stamp
and it is why they slipped through a staleness check that only compared
stamps: we held 27 August copies while 9 September ones were published.

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
| `2026-08-27-year3-sem5-btech-cse.pdf` | 27 Aug | superseded by 7 Sep sheet |
| `2026-08-27-*.pdf` (other 10 sheets) | 27 Aug | current for non-CSE; mailed 29 Aug |
| `2026-09-07-year3-sem5-btech-cse.pdf` | 7 Sep | current for Year 3 CSE; mailed 7 Sep |

The two MTECH-ETS sheets print no footer stamp at all; they are grouped
with the 27 August set because they arrived in that mail.
