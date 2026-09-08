// ============================================================
// BUS / VAN SHUTTLE — SCHEDULE DATA + TIME LOGIC (shared)
//
// Loaded by BOTH bus.html (the full page) and screen.html (the campus
// hall display). It holds the timetable and every function that turns a
// clock into departures; it touches NO DOM. Rendering lives in bus.js
// and screen.js respectively.
//
// This split exists so the hall screen and the website can never
// disagree about when a bus leaves. Edit a time here, both change.
// ============================================================

// ------------------------------------------------------------
// THE SCHEDULE — KCA 1&2 · KCA 3 · Campus
//
// The loop is one clockwise cycle:
//     KCA 1&2  ->  KCA 3  ->  Campus  ->  KCA 1&2  ->  ...
// so "Dorms to Campus" departs KCA 1&2 and "Campus to Dorms"
// departs Campus. KCA 3 is the middle stop on BOTH legs.
//
// TWO SERVICES, and they are not the same timetable:
//
//   Mon–Fri  the printed shift poster (photographed 2026-08-19).
//            A 7-vehicle day rota, then a two-van night shift.
//
//   Friday   the SAME poster timetable as Mon–Thu, minus a prayer break.
//            Campus notice, 2026-08-22, verbatim: "there will be no trips
//            between Campus and Dorms from 12:30 PM to 1:15 PM for friday."
//            Read as the break spanning [12:30, 1:15), service resuming
//            WITH the 1:15 run — so 12:30 / 12:45 / 1:00 are cancelled in
//            both directions and 1:15 still departs. That boundary reading
//            is the one judgement call here; it is recorded in the footnote
//            at the bottom of bus.html, not in prose above the table.
//            Cancelled runs are NOT deleted from the table: they stay in
//            place, struck through, keeping the poster's trip numbers, so
//            someone holding the printed poster can see why 12:30 is gone
//            instead of wondering whether the page lost a row.
//
//   Sat–Sun  the campus notice of 2026-08-22, verbatim: "Saturdays and
//            Sundays, vehicles will operate between the campus and
//            KCA 1,2 & 3 every 30 minutes in both directions, starting
//            from 7:30 AM."
//            CONFIRMED by that notice: the 7:30 AM start, the 30-minute
//            interval, both directions, the same three stops.
//            NOT in it: a LAST departure, and which vehicle runs which
//            trip. So the weekend list is split — everything up to
//            6:30 PM follows the notice, and the later runs are kept in
//            their own block, labelled as assumed, because a guessed
//            time that renders like a confirmed one is how someone ends
//            up standing at a stop at 11 PM for nothing.
//            When someone reads the actual board: fix WEEKEND_LAST.
//
// Times are stored as "HH:MM" 24h for math, rendered as 12h.
// ------------------------------------------------------------

const DAY_ROTA = ["Coaster 1", "Coaster 2", "Coaster 3", "Bus 1", "Bus 2", "Bus 3", "Coaster 4"];

// KCA 1&2 -> KCA 3, the middle stop on the outbound leg. NOT from the poster:
// the poster only prints departures from KCA 1&2. Evan timed this himself and
// puts it at about 5 minutes most times, 3-7 depending on traffic and on how
// long the driver holds. So it is rendered as a WINDOW, never as a single
// clock time -- a minute-precise arrival here would be a number nobody has.
// Only the outbound leg is offered: the Campus -> KCA 1&2 run does not
// reliably carry on to KCA 3 (observed), so estimating it would be inventing
// a service. If someone times Campus -> KCA 1&2, that leg can be added.
const KCA3_LEG = { lo: 3, hi: 7 };

// "10:15" + 5 -> "10:20"
function addMins(hhmm, add) {
    const m = (toMinutes(hhmm) + add) % (24 * 60);
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

// Weekend: start + interval are from the notice. The cut and the last
// departure are not — see the header comment.
const WEEKEND_START = "07:30";
const WEEKEND_NOTICE_UNTIL = "18:30";   // where the confirmed block ends
const WEEKEND_LAST = "23:30";           // ASSUMED, not from the notice
const WEEKEND_STEP = 30;

// The two directions share their stops across both services.
const DIRS = {
    toCampus: {
        id: "toCampus",
        label: "Dorms → Campus",
        short: "To Campus",
        from: "KCA 1&2",
        stops: ["KCA 1&2", "KCA 3", "Campus"],
    },
    toDorms: {
        id: "toDorms",
        label: "Campus → Dorms",
        short: "To Dorms",
        from: "Campus",
        stops: ["Campus", "KCA 1&2", "KCA 3"],
    },
};

// "07:30" .. "18:30" every 30 -> ["07:30", "08:00", ...]
function everyN(startHHMM, lastHHMM, stepMin) {
    const out = [];
    for (let m = toMinutes(startHHMM); m <= toMinutes(lastHHMM); m += stepMin) {
        out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    }
    return out;
}

// The poster timetable. Mon–Thu and Friday are the SAME arrays — Friday
// only differs by the prayer window, which is applied at render time from
// `noService`, so there is exactly one copy of these times to keep correct.
const POSTER_DIRS = {
    toCampus: {
                ...DIRS.toCampus,
                blocks: [
                    {
                        title: "Day shift", tag: "day shift", tagTone: "day", rota: DAY_ROTA,
                        times: [
                            "07:00", "07:10", "07:20", "07:30", "07:40", "07:50",
                            "08:00", "08:10", "08:20", "08:30", "08:40", "08:50",
                            "09:00", "09:10", "09:20", "09:30", "09:40", "09:50",
                            "10:00", "10:15", "10:30", "10:45",
                            "11:00", "11:15", "11:30", "11:45",
                            "12:00", "12:15", "12:30", "12:45",
                            "13:00", "13:15", "13:30", "13:40", "13:50",
                            "14:00", "14:10", "14:20", "14:30", "14:40", "14:50",
                            "15:00", "15:10", "15:20", "15:30", "15:45",
                            "16:00", "16:15", "16:30", "16:45",
                            "17:00", "17:15", "17:30", "17:45",
                            "18:00", "18:15", "18:30", "18:45",
                        ],
                    },
                    {
                        // From the transport office's own workbook, "Released
                        // on 17 Aug 2026" - the same release the poster carries.
                        // It adds Coaster 5 to the night shift, so the rota is a
                        // 3-cycle now, but NOT a clean one: trip 7 is printed
                        // "Not Available", so the list is written out per trip
                        // rather than generated. 20:50 here is not a typo for
                        // 20:40 - the sheet prints 20:50 in this direction and
                        // 20:40 in the other. Every time and vehicle below was
                        // machine-compared against that workbook, not eyeballed.
                        title: "Night shift", tag: "night shift", tagTone: "night", dashed: true,
                        rota: [
                            "VAN 1", "Coaster 5", "VAN 2",
                            "VAN 1", "Coaster 5", "VAN 2",
                            "not available",
                            "Coaster 5", "VAN 2",
                            "VAN 1", "Coaster 5", "VAN 2",
                            "VAN 1", "Coaster 5",
                        ],
                        times: [
                            "19:00", "19:20", "19:40",
                            "20:00", "20:20", "20:50",
                            "21:00", "21:20", "21:40",
                            "22:00", "22:20", "22:40",
                            "23:00", "23:20",
                        ],
                    },
                ],
            },
            toDorms: {
                ...DIRS.toDorms,
                blocks: [
                    {
                        title: "Day shift", tag: "day shift", tagTone: "day", rota: DAY_ROTA,
                        times: [
                            "07:30", "07:40", "07:50",
                            "08:00", "08:10", "08:20", "08:30", "08:40", "08:50",
                            "09:00", "09:10", "09:20", "09:30", "09:40", "09:50",
                            "10:00", "10:00", "10:15", "10:30", "10:45",
                            "11:00", "11:15", "11:30", "11:45",
                            "12:00", "12:15", "12:30", "12:45",
                            "13:00", "13:15", "13:30", "13:40", "13:50",
                            "14:00", "14:10", "14:20", "14:30", "14:40", "14:50",
                            "15:00", "15:10", "15:20", "15:30", "15:45",
                            "16:00", "16:15", "16:30", "16:45",
                            "17:00", "17:15", "17:30", "17:45",
                            "18:00", "18:15", "18:30", "18:45",
                        ],
                    },
                    {
                        title: "Night shift", tag: "night shift", tagTone: "night", dashed: true,
                        // NOT SHOWN, PENDING CONFIRMATION: the 17 Aug sheet
                        // prints "Campus -> KCA 3 -> KCA 1 & 2" for every night
                        // run in this direction - KCA 3 FIRST after dark, last
                        // during the day. Evan is checking whether the vans
                        // actually run that way before the page says so, since
                        // a printed order nobody has ridden is not evidence.
                        // To switch it on when he confirms, uncomment:
                        //     stops: ["Campus", "KCA 3", "KCA 1&2"],
                        // renderTable already prefers a block's stops over the
                        // direction's, so that one line is the whole change.
                        rota: [
                            "Coaster 5", "VAN 2", "VAN 1",
                            "Coaster 5", "VAN 2", "VAN 1",
                            "Coaster 5", "VAN 2",
                            "not available",
                            "Coaster 5", "VAN 2", "VAN 1",
                            "Coaster 5", "VAN 2", "VAN 1", "Coaster 5",
                        ],
                        times: [
                            "19:00", "19:20", "19:40",
                            "20:00", "20:20", "20:40",
                            "21:00", "21:20", "21:40",
                            "22:00", "22:20", "22:40",
                            "23:00", "23:20", "23:40",
                            "24:00",
                        ],
                    },
                ],
            },
};

const SCHEDULES = {
    // ---------- Mon–Thu: the printed poster ----------
    weekday: {
        key: "weekday",
        label: "Mon – Thu",
        short: "Mon – Thu",
        numbering: "perBlock",       // the poster restarts at 1 for the night shift
        dirs: POSTER_DIRS,
    },

    // ---------- Friday: the poster, minus the prayer break ----------
    friday: {
        key: "friday",
        label: "Friday",
        short: "Fri",
        numbering: "perBlock",
        dirs: POSTER_DIRS,
        noService: { from: "12:30", to: "13:15", reason: "Friday prayer" },
    },

    // ---------- Sat–Sun: the notice ----------
    weekend: {
        key: "weekend",
        label: "Sat & Sun",
        short: "Sat & Sun",
        numbering: "continuous",     // one service, so the numbers just run on
        dirs: {
            toCampus: {
                ...DIRS.toCampus,
                blocks: [
                    {
                        title: "Every 30 minutes — from the notice", tag: "every 30 min", tagTone: "day",
                        times: everyN(WEEKEND_START, WEEKEND_NOTICE_UNTIL, WEEKEND_STEP),
                    },
                    {
                        title: "Later runs — assumed, not in the notice", tag: "assumed", tagTone: "soft",
                        dashed: true, assumed: true,
                        times: everyN("19:00", WEEKEND_LAST, WEEKEND_STEP),
                    },
                ],
            },
            toDorms: {
                ...DIRS.toDorms,
                blocks: [
                    {
                        title: "Every 30 minutes — from the notice", tag: "every 30 min", tagTone: "day",
                        times: everyN(WEEKEND_START, WEEKEND_NOTICE_UNTIL, WEEKEND_STEP),
                    },
                    {
                        title: "Later runs — assumed, not in the notice", tag: "assumed", tagTone: "soft",
                        dashed: true, assumed: true,
                        times: everyN("19:00", WEEKEND_LAST, WEEKEND_STEP),
                    },
                ],
            },
        },
    },
};

// ---------- helpers ----------

// "13:45" -> 825. "24:00" -> 1440 (past midnight, still "tonight").
function toMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

// 825 -> "1:45 PM". 1440 -> "12:00 AM".
function to12h(hhmm) {
    let [h, m] = hhmm.split(":").map(Number);
    h = h % 24;
    const suffix = h < 12 ? "AM" : "PM";
    let display = h % 12;
    if (display === 0) display = 12;
    return `${display}:${String(m).padStart(2, "0")} ${suffix}`;
}

// Which service runs on a given date. 0 = Sunday, 5 = Friday, 6 = Saturday.
// Friday is NOT the weekend here — it is a full teaching day at IITD-AD that
// happens to carry a prayer break, so it runs the poster with a hole in it.
function dayKey(d) {
    const n = d.getDay();
    if (n === 0 || n === 6) return "weekend";
    if (n === 5) return "friday";
    return "weekday";
}

function todayKey() {
    return dayKey(new Date());
}

function tomorrowKey() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return dayKey(d);
}

// Number the trips of one direction and hand back both the blocks (for
// the tables) and one flat ordered list (for "what leaves next").
// `blocks` keeps every row including cancelled ones, because the TABLE has to
// show them struck through — a silently missing 12:30 row is indistinguishable
// from a bug. `all` drops them, because a cancelled run is not a departure and
// must never be what a countdown points at.
function trips(sched, dir) {
    const gap = sched.noService;
    const gapFrom = gap ? toMinutes(gap.from) : 0;
    const gapTo = gap ? toMinutes(gap.to) : 0;
    let n = 0;
    const blocks = dir.blocks.map((b) => {
        if (sched.numbering !== "continuous") n = 0;
        const rows = b.times.map((t, i) => {
            const mins = toMinutes(t);
            const veh = b.rota ? b.rota[i % b.rota.length] : null;
            // The sheet prints "Not Available" against a trip with no vehicle
            // assigned to it. That is a trip that does not run, not a trip
            // with a strangely named van, and showing it as a departure is how
            // someone ends up waiting at 9pm for nothing.
            const unstaffed = /^not available$/i.test(String(veh || ""));
            // half-open [from, to): the run AT the end of the break departs
            const inGap = !!gap && mins >= gapFrom && mins < gapTo;
            return {
                no: ++n,
                time: t,
                mins,
                vehicle: unstaffed ? null : veh,
                tag: b.tag || null,
                tagTone: b.tagTone || "day",
                assumed: !!b.assumed,
                cancelled: unstaffed || inGap,
                why: unstaffed ? "no vehicle assigned" : (inGap ? gap.reason : null),
            };
        });
        return { ...b, rows };
    });
    const every = blocks.reduce((acc, b) => acc.concat(b.rows), []);
    return { blocks, every, all: every.filter((t) => !t.cancelled) };
}

function hasVehicles(dir) {
    return dir.blocks.some((b) => b.rota);
}

function nowMinutes() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
}

// Minutes until departure, accounting for the 24:00 trip and wrap to tomorrow.
function untilLabel(mins, now) {
    let delta = mins - now;
    if (delta < 0) delta += 24 * 60; // rolls to tomorrow's first run
    if (delta === 0) return "now";
    if (delta < 60) return `${delta} min`;
    const h = Math.floor(delta / 60);
    const m = delta % 60;
    return m ? `${h} h ${m} m` : `${h} h`;
}

// A trip stays "active" for next-card and timetable highlighting as long as it
// has not finished its leg. For outbound runs to Campus, the KCA 3 leg finishes
// KCA3_LEG.hi (7) minutes after leaving KCA 1&2. For other runs, keep a 2-minute
// window so a run departing at :00 is not dropped at :00:01 while boarding.
function activeTrip(t, now, dirId) {
    if (dirId === "toCampus") {
        return t.mins + KCA3_LEG.hi >= now;
    }
    return t.mins + 2 >= now;
}
