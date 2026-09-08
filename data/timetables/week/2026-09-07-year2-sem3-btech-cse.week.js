// 2026-09-07-year2-sem3-btech-cse.pdf
// 28 blocks exported by tools/parse_timetable.py
// L-T-P-C check: 4/4 courses reconcile
// declared in the course table but not on the grid: AHSL2675, AHSL2062
const WEEK = {
    1: [ // Monday
        ["09:00", "09:50", "AMLL1001", "M4-1-011", "", 0],
        ["10:30", "11:50", "AMEL1140", "M4-0-019", "", 0],
        ["14:00", "15:20", "ACOL2015", "M4-0-021", "", 0],
        ["17:00", "18:50", "ACOL2010", "M3-0-004", "lab", 0],
    ],
    2: [ // Tuesday
        ["10:00", "10:50", "AMTL2006", "M4-0-021", "", 0],
        ["11:00", "11:50", "ACOL2010", "M4-0-021", "", 0],
        ["12:00", "12:50", "AELL1000", "M4-0-005", "", 0],
        ["14:00", "15:50", "AMLL1001", "M2-2-031", "", 0],
        ["14:00", "15:50", "AMEL1140", "M3-1-009", "", 0],
        ["16:00", "16:50", "AMTL2006", "M4-0-011", "tut", 0],
        ["17:00", "17:50", "ACOL1101", "M4-0-021", "", 0],
        ["18:00", "19:50", "ACOL1101", "M3-0-022", "lab", 0],
    ],
    3: [ // Wednesday
        ["08:00", "08:50", "ACOL1101", "M4-0-021", "", 0],
        ["09:00", "09:50", "AMLL1001", "M4-1-011", "", 0],
        ["10:30", "11:50", "AMEL1140", "M4-0-021", "", 0],
        ["14:00", "15:20", "ACOL2015", "M4-0-021", "", 0],
        ["17:00", "18:50", "ACOL2015", "M3-0-004", "lab", 0],
    ],
    4: [ // Thursday
        ["09:00", "09:50", "AMLL1001", "M4-1-011", "", 0],
        ["10:00", "10:50", "AMTL2006", "M4-0-021", "", 0],
        ["11:00", "11:50", "ACOL2010", "M4-0-021", "", 0],
        ["12:00", "12:50", "AELL1000", "M4-0-005", "", 0],
        ["14:00", "15:50", "AMEL1140", "M3-1-009", "", 0],
        ["14:00", "15:50", "AMLL1001", "M2-2-031", "", 0],
        ["16:00", "17:50", "AELL1000", "M3-1-014", "lab", 0],
        ["18:00", "18:50", "AMLL1001", "M4-0-011", "", 0],
    ],
    5: [ // Friday
        ["08:00", "08:50", "ACOL1101", "M4-0-021", "", 0],
        ["10:00", "10:50", "AMTL2006", "M4-0-021", "", 0],
        ["11:00", "11:50", "ACOL2010", "M4-0-021", "", 0],
    ],
};

// 13 cell(s) with no course code (reserved slots, lunch, free text) — not classes:
//   Monday 08:00  May be used for additional classes
//   Monday 12:00  deludehcs hcnuL era sessalc sselnU
//   Monday 12:00  May be used for additional classes
//   Tuesday 08:00  May be used for additional classes
//   Tuesday 14:00  General Engineering
//   Wednesday 12:00  May be used for additional classes
//   Thursday 12:00  General Engineering ELECTIVE 3
//   Thursday 16:00  General Engineering
//   Thursday 18:00  General Engineering
//   Thursday 09:00  ELECTIVE 2
//   Thursday 14:00  General Engineering ELECTIVE 2
//   Thursday 18:00  Tutorial*
//   ... and 1 more
