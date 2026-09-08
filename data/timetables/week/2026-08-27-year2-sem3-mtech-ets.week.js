// 2026-08-27-year2-sem3-mtech-ets.pdf
// 8 blocks exported by tools/parse_timetable.py
// L-T-P-C check: 1/3 courses reconcile
// DOES NOT RECONCILE -- check these before trusting them:
//   AETL726 (-1L +2P, g0)
//   AETL728 (-1L +2P, g0)
// declared in the course table but not on the grid: AETD781
const WEEK = {
    1: [ // Monday
        ["15:30", "16:50", "AETL728", "M4-0-017", "", 0],
        ["17:30", "20:20", "AETP715", "M4-0-018", "", 0],
    ],
    2: [ // Tuesday
        ["15:30", "16:50", "AETL739", "M4-1-011", "", 0],
        ["15:30", "16:50", "AETL739", "M4-0-021", "", 0],
        ["17:30", "18:50", "AETL726", "M4-1-011", "", 0],
        ["17:30", "18:50", "AETL726", "M4-0-019", "proj", 0],
    ],
    4: [ // Thursday
        ["15:30", "16:50", "AETL728", "M4-1-017", "proj", 0],
    ],
    5: [ // Friday
        ["10:00", "11:50", "AETP717", "M4-1-011", "", 0],
    ],
};
