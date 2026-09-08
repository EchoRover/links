// 2026-09-07-year2-sem3-btech-che.pdf
// 14 blocks exported by tools/parse_timetable.py
// L-T-P-C check: 6/6 courses reconcile
// declared in the course table but not on the grid: ACHL2001, AHSL2062, AHSL2675
const WEEK = {
    1: [ // Monday
        ["10:00", "11:20", "ACHL2002", "M4-0-017", "", 0],
    ],
    2: [ // Tuesday
        ["08:00", "08:50", "ACHL1002", "M4-0-017", "", 0],
        ["09:00", "09:50", "ASBL1100", "M4-0-017", "", 0],
        ["10:00", "10:50", "ACHL1000", "M4-0-017", "", 0],
        ["11:00", "11:50", "AMTL2008", "M4-0-017", "", 0],
        ["14:00", "14:50", "AMTL2008", "M4-0-017", "tut", 1],
        ["15:00", "15:50", "ACHL1002", "M4-0-021", "tut", 1],
    ],
    3: [ // Wednesday
        ["10:00", "10:50", "ACHL2002", "M4-0-017", "tut", 0],
        ["11:00", "11:50", "AMTL2008", "M4-0-017", "", 0],
    ],
    4: [ // Thursday
        ["08:00", "08:50", "ACHL1002", "M4-0-017", "", 0],
        ["09:00", "09:50", "ASBL1100", "M4-0-017", "", 0],
        ["10:00", "11:20", "ACHL2002", "M4-0-017", "", 0],
        ["14:00", "15:50", "ASBP1100", "M3-1-031", "lab", 0],
    ],
    5: [ // Friday
        ["11:00", "11:50", "AMTL2008", "M4-0-017", "", 0],
    ],
};

// 12 cell(s) with no course code (reserved slots, lunch, free text) — not classes:
//   Monday 08:00  May be used for additional classes
//   Monday 12:00  hcnuL
//   Monday 14:00  ACHL 2001 M4-0-017 M4-Classroom 4 14:00 - 15:20
//   Monday 17:00  May be used for additional classes
//   Tuesday 16:00  ACHL 2001 M4-0-018 M4-ComputerLab 16:00 - 17:50
//   Tuesday 18:00  May be used for additional classes
//   Wednesday 08:00  May be used for additional classes
//   Wednesday 17:00  May be used for additional classes
//   Wednesday 14:00  ACHL 2001 M4-0-017
//   Wednesday 14:00  M4-Classroom 4 14:00 - 15:20
//   Thursday 16:00  May be used for additional classes
//   Friday 08:00  May be used for additional classes
