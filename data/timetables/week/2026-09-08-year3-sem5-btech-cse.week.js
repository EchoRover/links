// 2026-09-08-year3-sem5-btech-cse.pdf
// 23 blocks exported by tools/parse_timetable.py
// L-T-P-C check: 6/7 courses reconcile
// DOES NOT RECONCILE -- check these before trusting them:
//   ACOD310 (-4P, g0)
const WEEK = {
    1: [ // Monday
        ["09:00", "09:50", "AHUL261", "M4-1-017", "tut", 1],
        ["10:00", "10:50", "ACOL331", "M4-1-017", "", 0],
        ["11:00", "11:50", "ACOL333", "M4-1-017", "", 0],
        ["14:00", "15:20", "AHUL256", "M4-0-011", "", 0],
        ["16:00", "18:50", "AGRL130", "M4-0-011", "", 0],
    ],
    2: [ // Tuesday
        ["08:00", "08:50", "ACOL351", "M4-1-017", "", 0],
        ["09:00", "09:50", "ACOL331", "M4-1-017", "", 0],
        ["11:00", "11:50", "ACOL333", "M4-1-017", "", 0],
        ["14:00", "15:20", "AHUL261", "M4-0-011", "", 0],
        ["15:30", "16:20", "AHUL256", "M4-1-017", "tut", 2],
        ["16:30", "18:20", "ACOL333", "M3-0-004", "lab", 0],
    ],
    3: [ // Wednesday
        ["08:00", "09:50", "ACOL331", "M3-0-004", "lab", 0],
        ["10:00", "10:50", "ACOL351", "M4-1-017", "", 0],
        ["11:00", "11:50", "AHUL261", "M4-1-017", "tut", 2],
        ["14:00", "15:20", "AHUL256", "M4-0-011", "", 0],
        ["15:30", "16:20", "ACOL351", "M4-0-019", "tut", 0],
        ["17:00", "17:50", "AHUL256", "M4-1-017", "tut", 1],
    ],
    4: [ // Thursday
        ["09:00", "09:50", "ACOL331", "M4-1-017", "", 0],
        ["11:00", "11:50", "ACOL333", "M4-1-017", "", 0],
        ["14:00", "15:20", "AHUL261", "M4-0-011", "", 0],
        ["15:30", "17:20", "ACOL331", "M3-0-004", "lab", 0],
    ],
    5: [ // Friday
        ["08:00", "08:50", "ACOL351", "M4-1-017", "", 0],
        ["10:00", "11:50", "ACOD310", "M4-1-017", "proj", 0],
    ],
};

// 7 cell(s) with no course code (reserved slots, lunch, free text) — not classes:
//   Monday 08:00  May be used for additional classes
//   Monday 12:00  hcnuL
//   Monday 08:00  May be used for additional classes
//   Wednesday 18:00  May be used for additional classes
//   Wednesday 16:30  May be used for additional classes
//   Thursday 08:00  May be used for additional classes
//   Thursday 17:30  May be used for additional classes
