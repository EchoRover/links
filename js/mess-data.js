// ============================================================
// MESS MENU — DATA ACCESS + TIME LOGIC (shared).
//
// The menu and the serving times come from js/gen/mess.js, which is
// generated from data/mess/*.json. This file holds every function that
// turns a clock into "what is being served"; it touches NO DOM, so the
// page and the hall screen can never disagree about whether dinner has
// started.
//
// Same split as bus-data.js, and for the same reason.
// ============================================================

const MESS_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
                   "Friday", "Saturday"];

function messMins(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

// Which half of the rotation a date falls in. Counted in whole weeks from a
// Monday we actually checked against the wall, so it stays right without
// anyone maintaining it - the only thing that could break it is the mess
// restarting the cycle out of step.
function messWeekOf(date) {
    const cycle = MESS.service.cycle;
    const [y, m, d] = cycle.anchor_monday.split("-").map(Number);
    const anchor = new Date(y, m - 1, d);
    const here = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    // start of this date's week, Monday-first
    const dow = (here.getDay() + 6) % 7;
    here.setDate(here.getDate() - dow);
    const weeks = Math.round((here - anchor) / (7 * 24 * 3600 * 1000));
    const flip = ((weeks % 2) + 2) % 2;
    return flip === 0 ? cycle.anchor_week : (cycle.anchor_week === 1 ? 2 : 1);
}

function messIsWeekend(dayName) {
    return MESS.service.weekend_days.includes(dayName);
}

// A meal's window on a given day. Breakfast runs later at the weekend; the
// override lives in the data, not in an if-statement here.
function messWindow(meal, dayName) {
    const spec = MESS.service.meals.find(x => x.meal === meal);
    if (!spec) return null;
    const w = messIsWeekend(dayName) && spec.weekend ? spec.weekend : spec;
    return { start: w.start, end: w.end,
             from: messMins(w.start), to: messMins(w.end), label: spec.label };
}

// What is on right now, what is next, and how long until it. Returns null for
// `now` when nothing is being served, which is most of the day - the page says
// so rather than pretending a meal is in progress.
function messStatus(date) {
    const dayName = MESS_DAYS[date.getDay()];
    const mins = date.getHours() * 60 + date.getMinutes();
    const today = MESS.service.meals.map(s => ({
        meal: s.meal, ...messWindow(s.meal, dayName)
    })).sort((a, b) => a.from - b.from);

    const now = today.find(x => mins >= x.from && mins < x.to) || null;
    let next = today.find(x => mins < x.from) || null;
    let tomorrow = false;
    if (!next) {
        const d2 = new Date(date);
        d2.setDate(d2.getDate() + 1);
        const name2 = MESS_DAYS[d2.getDay()];
        const first = MESS.service.meals[0];
        next = { meal: first.meal, ...messWindow(first.meal, name2) };
        tomorrow = true;
    }
    return {
        day: dayName, week: messWeekOf(date), now, next, tomorrow,
        untilNext: next ? (next.from - mins + (tomorrow ? 24 * 60 : 0)) : null,
        untilEnd: now ? now.to - mins : null
    };
}

// The courses for one meal on one day, as [{course, rule, items[]}].
function messMenu(week, meal, dayName) {
    const sheet = (MESS.menu[String(week)] || {})[meal];
    if (!sheet) return [];
    return sheet.map(c => ({ course: c.course, rule: c.rule,
                             items: c.cells[dayName] || [] }))
                .filter(c => c.items.length);
}
