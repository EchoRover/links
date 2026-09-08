// 2026-09-07-year3-sem5-btech-een.pdf
// 25 blocks exported by tools/parse_timetable.py
// L-T-P-C check: 3/6 courses reconcile
// DOES NOT RECONCILE -- check these before trusting them:
//   AENL226 (+1L, g0)
//   AENL228 (+4L -2P, g0)
//   AHUL261 (+1L, g2)
const WEEK = {
    1: [ // Monday
        ["09:00", "09:50", "AHUL261", "M4-1-017", "", 0],
        ["10:00", "10:50", "AENL226", "M2-2-007", "", 0],
        ["11:00", "11:50", "AENL228", "M2-2-007", "", 0],
        ["14:00", "15:20", "AHUL256", "M4-0-011", "", 0],
        ["16:00", "18:50", "AGRL130", "M4-0-011", "", 0],
    ],
    2: [ // Tuesday
        ["10:00", "10:50", "ASBL100", "M2-2-007", "", 0],
        ["11:00", "12:20", "AENL226", "M4-0-011", "", 0],
        ["14:00", "15:20", "AHUL261", "M4-0-011", "", 0],
        ["15:30", "16:20", "AHUL256", "M4-1-017", "tut", 2],
        ["16:00", "18:50", "AENP225", "M3-1-009", "", 0],
    ],
    3: [ // Wednesday
        ["08:00", "08:50", "AENL228", "M2-2-007", "", 0],
        ["09:00", "11:50", "AENP200", "M3-1-009", "", 0],
        ["09:00", "10:50", "AENL228", "M2-2-031", "", 0],
        ["11:00", "11:50", "AHUL261", "M4-1-017", "tut", 2],
        ["14:00", "15:20", "AHUL256", "M4-0-011", "", 0],
        ["15:30", "18:20", "AENP200", "M3-1-009", "", 0],
        ["17:00", "17:50", "AHUL256", "M4-1-017", "tut", 1],
    ],
    4: [ // Thursday
        ["09:00", "09:50", "AENL226", "M2-2-007", "tut", 0],
        ["10:00", "10:50", "ASBL100", "M2-2-007", "", 0],
        ["11:00", "12:20", "AENL226", "M4-0-011", "", 0],
        ["14:00", "15:20", "AHUL261", "M4-0-011", "", 0],
        ["16:00", "17:50", "AENL228", "M2-2-031", "", 0],
        ["16:00", "18:50", "AENP225", "M3-1-009", "", 0],
    ],
    5: [ // Friday
        ["08:00", "08:50", "ASBL100", "M2-2-007", "", 0],
        ["10:00", "11:50", "ASBL100", "M3-1-031", "lab", 0],
    ],
};

// 6 cell(s) with no course code (reserved slots, lunch, free text) — not classes:
//   Monday 08:00  May be used for additional classes
//   Monday 08:00  May be used for additional classes
//   Tuesday 08:00  May be used for additional classes
//   Wednesday 15:30  May be used for additional classes
//   Thursday 08:00  May be used for additional classes
//   Friday 09:00  May be used for additional
