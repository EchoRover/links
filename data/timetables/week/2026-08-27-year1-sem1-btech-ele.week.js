// 2026-08-27-year1-sem1-btech-ele.pdf
// 30 blocks exported by tools/parse_timetable.py
// NO L-T-P-C table on this sheet — nothing checked this parse. Treat every block as unverified.
const WEEK = {
    1: [ // Monday
        ["08:00", "09:30", "AMTL1001", "M4-0-005", "", 0],
        ["08:00", "12:00", "ACMP1000", "M3-1-029", "lab", 0],
        ["10:00", "11:00", "AMTL1001", "M2-2-009", "tut", 1],
        ["10:00", "11:00", "APYL1001", "M2-2-015", "tut", 3],
        ["11:00", "12:00", "AMTL1001", "M4-0-021", "tut", 3],
        ["12:00", "14:00", "ACML1001", "M4-0-005", "", 0],
        ["15:30", "19:00", "AMTL1001", "M2-2-009", "tut", 2],
    ],
    2: [ // Tuesday
        ["09:00", "10:00", "APYL1001", "M2-2-015", "tut", 1],
        ["09:00", "10:30", "ACOL1000", "M4-0-005", "", 0],
        ["10:30", "12:00", "ACOL1000", "M4-0-005", "", 0],
        ["11:00", "14:00", "ACML1001", "M2-2-009", "tut", 3],
        ["11:00", "14:00", "AMTL1001", "M2-2-015", "tut", 4],
        ["15:00", "17:00", "ACOL1000", "M3-1-004", "lab", 0],
        ["15:00", "16:30", "AMTL1001", "M4-0-005", "", 0],
        ["17:00", "19:00", "ACOL1000", "M3-1-004", "lab", 0],
    ],
    3: [ // Wednesday
        ["08:00", "09:30", "AMTL1001", "M4-0-005", "", 0],
        ["08:00", "12:00", "ACMP1000", "M3-1-029", "lab", 0],
        ["10:00", "12:00", "ACOL1000", "M3-1-004", "lab", 0],
        ["12:00", "14:00", "ACML1001", "M4-0-005", "", 0],
        ["16:00", "19:00", "ACOL1000", "M3-1-004", "lab", 0],
    ],
    4: [ // Thursday
        ["09:00", "10:30", "ACOL1000", "M4-0-005", "", 0],
        ["09:30", "10:30", "APYL1001", "M2-2-015", "tut", 2],
        ["10:30", "12:00", "ACOL1000", "M4-0-005", "", 0],
        ["11:00", "14:00", "ACML1001", "M2-2-009", "tut", 4],
        ["15:00", "16:00", "ACML1001", "M2-2-009", "tut", 1],
        ["15:00", "19:00", "ACMP1000", "M3-1-029", "lab", 0],
        ["15:00", "17:00", "ACOL1000", "M3-1-004", "lab", 0],
        ["17:00", "19:00", "ACOL1000", "M3-1-004", "lab", 0],
    ],
    5: [ // Friday
        ["08:00", "12:00", "ACMP1000", "M3-1-029", "lab", 0],
        ["10:30", "12:00", "AMTL1001", "M4-0-005", "", 0],
    ],
};

// 39 cell(s) with no course code (reserved slots, lunch, free text) — not classes:
//   Monday 11:00  May be used for additional classes
//   Monday 13:00  h c n u L
//   Monday 15:30  May be used for additional classes
//   Monday 16:30  May be used for additional classes
//   Monday 18:00  May be used for additional classes
//   Monday 09:30  May be used for additional classes
//   Monday 08:00  May be used for additional classes
//   Monday 15:00  May be used for additional classes
//   Tuesday 12:00  May be used for additional classes
//   Tuesday 16:30  May be used for additional classes
//   Wednesday 18:00  used for additional
//   Wednesday 15:00  May be used for additional classes May be
//   ... and 27 more
