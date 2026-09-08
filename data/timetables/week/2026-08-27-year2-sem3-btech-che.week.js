// 2026-08-27-year2-sem3-btech-che.pdf
// 18 blocks exported by tools/parse_timetable.py
// L-T-P-C check: 8/8 courses reconcile
// declared in the course table but not on the grid: ACHL2001
const WEEK = {
    1: [ // Monday
        ["10:00", "11:20", "ACHL2002", "M4-0-017", "", 0],
        ["14:00", "15:20", "AHSL2062", "M4-1-011", "", 0],
        ["15:30", "16:50", "AHSL2675", "M4-1-011", "", 0],
    ],
    2: [ // Tuesday
        ["08:00", "08:50", "ACHL1002", "M4-0-017", "", 0],
        ["09:00", "09:50", "ASBL1100", "M4-0-017", "", 0],
        ["10:00", "10:50", "ACHL1000", "M4-0-017", "", 0],
        ["10:00", "10:50", "ACHL2002", "M4-0-017", "tut", 1],
        ["11:00", "11:50", "AMTL2008", "M4-0-017", "", 0],
        ["11:00", "11:50", "AMTL2008", "M4-0-017", "", 0],
        ["14:00", "14:50", "AMTL2008", "M4-0-017", "tut", 1],
        ["14:00", "15:20", "AHSL2062", "M4-1-011", "", 0],
        ["15:00", "15:50", "ACHL1002", "M4-0-021", "tut", 1],
        ["15:30", "16:50", "AHSL2675", "M4-1-011", "", 0],
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

// 9 cell(s) with no course code (reserved slots, lunch, free text) — not classes:
//   Monday 08:00  ACHL 2001 M4-0-017 M4-Classroom 4 8:00 - 9:20
//   Monday 12:00  hcnuL
//   Monday 17:00  May be used for additional classes
//   Tuesday 16:00  ACHL 2001 M4-0-018 M4-ComputerLab 16:00 - 17:50
//   Tuesday 18:00  May be used for additional classes
//   Tuesday 08:00  ACHL 2001 M4-0-017 M4-Classroom 4 8:00 - 9:20
//   Tuesday 17:00  May be used for additional classes
//   Thursday 16:00  May be used for additional classes
//   Friday 08:00  May be used for additional classes
