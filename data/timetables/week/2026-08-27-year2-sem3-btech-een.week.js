// 2026-08-27-year2-sem3-btech-een.pdf
// 26 blocks exported by tools/parse_timetable.py
// L-T-P-C check: 6/8 courses reconcile
// DOES NOT RECONCILE -- check these before trusting them:
//   AMEL1140 (+2P, g0)
//   AMLL1001 (+4L +1T -2P, g1)
const WEEK = {
    1: [ // Monday
        ["08:00", "08:50", "AESL2061", "M4-0-019", "", 0],
        ["09:00", "09:50", "AMLL1001", "M4-1-011", "", 0],
        ["10:30", "11:50", "AMEL1140", "M4-0-019", "", 0],
        ["14:00", "15:20", "AHSL2062", "M4-1-011", "", 0],
        ["15:30", "16:50", "AHSL2675", "M4-1-011", "", 0],
    ],
    2: [ // Tuesday
        ["08:00", "08:50", "ACML1002", "M4-0-011", "", 0],
        ["09:00", "09:50", "AESL2061", "M4-1-011", "", 0],
        ["10:00", "10:50", "AESL2020", "M4-0-019", "", 0],
        ["11:00", "11:50", "AESL2060", "M4-0-019", "", 0],
        ["14:00", "15:50", "AMLL1001", "M2-2-031", "", 0],
        ["14:00", "15:50", "AMEL1140", "M3-1-009", "lab", 0],
        ["16:30", "17:20", "ACML1002", "M2-2-007", "tut", 1],
    ],
    3: [ // Wednesday
        ["08:00", "08:50", "AESL2061", "M4-0-019", "", 0],
        ["09:00", "09:50", "AMLL1001", "M4-1-011", "", 0],
        ["10:30", "11:50", "AMEL1140", "M4-0-019", "", 0],
        ["14:00", "15:20", "AHSL2062", "M4-1-011", "", 0],
        ["15:30", "16:50", "AHSL2675", "M4-1-011", "", 0],
        ["17:00", "17:50", "AMLL1001", "M4-0-019", "tut", 1],
    ],
    4: [ // Thursday
        ["08:00", "08:50", "ACML1002", "M4-0-011", "", 0],
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

// 6 cell(s) with no course code (reserved slots, lunch, free text) — not classes:
//   Monday 12:00  hcnuL
//   Monday 17:00  May be used for additional classes
//   Tuesday 17:30  May be used for additional classes
//   Wednesday 18:00  May be used for additional classes
//   Thursday 16:00  May be used for additional classes
//   Friday 08:00  May be used for additional classes
