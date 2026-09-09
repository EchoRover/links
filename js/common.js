// CSE_WEEK is DERIVED from the one timetable in data/linkcs/timetable.json
// (via js/gen/data.js). It used to be a second, hand-copied grid, and it had
// silently fallen two revisions behind: it still had ACOL331 at Monday 10:00
// (moved to 09:00 on 7 Sep), ACOL351 on Friday at 09:00 (moved to 08:00 on
// 8 Sep), no AHUL261 Monday tutorial, and no ACOL351 Wednesday tutorial at
// all. This page answers "when are we both free", so a stale grid here does
// not look broken, it just quietly gives the wrong answer.
//
// Shape kept as [start, end, course, group] because that is what
// pages/common.html reads.
const CSE_WEEK = Object.fromEntries(
    Object.entries(WEEK).map(([day, blocks]) => [
        Number(day),
        blocks.map(([s, e, code, , , grp]) => [s, e, code, grp]),
    ])
);

// EEN_WEEK is still a hand-held copy: the EEN cohort's sheet is not in the
// data layer yet, so there is nothing to derive it from. It has NOT been
// re-checked against the current EEN revision.
const EEN_WEEK = {
    1: [
        ["10:00", "10:50", "AENL226", 0],
        ["11:00", "11:50", "AENL228", 0],
        ["14:00", "15:20", "AHUL256", 0],
        ["16:00", "18:50", "AGRL130", 0],
    ],
    2: [
        ["10:00", "10:50", "ASBL100", 0],
        ["11:00", "12:20", "AENL226", 0],
        ["14:00", "15:20", "AHUL261", 0],
        ["15:30", "16:20", "AHUL256", 2],
        ["16:00", "18:50", "AENP225", 1],
    ],
    3: [
        ["08:00", "08:50", "AENL228", 2],
        ["09:00", "11:50", "AENP200", 1],
        ["09:00", "10:50", "AENL228", 2],
        ["11:00", "11:50", "AHUL261", 2],
        ["14:00", "15:20", "AHUL256", 0],
        ["15:30", "16:20", "AHUL261", 1],
        ["15:30", "18:20", "AENP200", 2],
        ["17:00", "17:50", "AHUL256", 1],
    ],
    4: [
        ["09:00", "09:50", "AENL226", 0],
        ["10:00", "10:50", "ASBL100", 0],
        ["11:00", "12:20", "AENL226", 0],
        ["14:00", "15:20", "AHUL261", 0],
        ["16:00", "17:50", "AENL228", 1],
        ["16:00", "18:50", "AENP225", 2],
    ],
    5: [
        ["08:00", "08:50", "ASBL100", 0],
        ["10:00", "11:50", "ASBL100", 0],
    ],
};
