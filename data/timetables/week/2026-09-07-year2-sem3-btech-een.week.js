// 2026-09-07-year2-sem3-btech-een.pdf
// 21 blocks exported by tools/parse_timetable.py
// L-T-P-C check: 3/6 courses reconcile
// DOES NOT RECONCILE -- check these before trusting them:
//   ACML1002 (-1L, g1)
//   AMEL1140 (+2P, g0)
//   AMLL1001 (+4L +1T -2P, g1)
// declared in the course table but not on the grid: AHSL2675, AHSL2062
const WEEK = {
    1: [ // Monday
        ["09:00", "09:50", "AMLL1001", "M4-1-011", "", 0],
        ["10:30", "11:50", "AMEL1140", "M4-0-019", "", 0],
        ["14:00", "14:50", "AESL2061", "M4-0-019", "", 0],
    ],
    2: [ // Tuesday
        ["08:00", "08:50", "ACML1002", "M4-0-011", "", 0],
        ["09:00", "09:50", "AESL2061", "M4-1-011", "", 0],
        ["10:00", "10:50", "AESL2020", "M4-0-019", "", 0],
        ["11:00", "11:50", "AESL2060", "M4-0-019", "", 0],
        ["14:00", "15:50", "AMLL1001", "M2-2-031", "", 0],
        ["14:00", "15:50", "AMEL1140", "M3-1-009", "lab", 0],
        ["16:30", "17:30", "ACML1002", "M4-0-019", "tut", 1],
    ],
    3: [ // Wednesday
        ["08:00", "08:50", "AESL2061", "M4-0-019", "", 0],
        ["09:00", "09:50", "AMLL1001", "M4-1-011", "", 0],
        ["10:30", "11:50", "AMEL1140", "M4-0-019", "", 0],
        ["17:00", "17:50", "AMLL1001", "M4-0-019", "tut", 1],
    ],
    4: [ // Thursday
        ["09:00", "09:50", "AMLL1001", "M4-1-011", "", 0],
        ["10:00", "10:50", "AESL2020", "M4-0-019", "", 0],
        ["11:00", "11:50", "AESL2060", "M4-0-019", "", 0],
        ["14:00", "15:50", "AMEL1140", "M3-1-009", "lab", 0],
        ["14:00", "15:50", "AMLL1001", "M2-2-031", "", 0],
    ],
    5: [ // Friday
        ["10:00", "10:50", "AESL2020", "M4-0-019", "", 0],
        ["11:00", "11:50", "AESL2060", "M4-0-019", "", 0],
    ],
};

// 8 cell(s) with no course code (reserved slots, lunch, free text) — not classes:
//   Monday 08:00  May be used for additional classes
//   Monday 12:00  hcnuL
//   Monday 17:00  May be used for additional classes
//   Tuesday 17:30  May be used for additional classes
//   Wednesday 18:00  May be used for additional classes
//   Thursday 16:00  May be used for additional classes
//   Thursday 08:00  M4-0-011 Lecture Hall 8:00 - 8:50
//   Friday 08:00  May be used for additional classes
