// ============================================================
// BUS / VAN SHUTTLE SCHEDULE — KCA 1&2 · KCA 3 · Campus
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
// ============================================================

const DAY_ROTA = ["Coaster 1", "Coaster 2", "Coaster 3", "Bus 1", "Bus 2", "Bus 3", "Coaster 4"];

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

const SCHEDULES = {
    // ---------- Mon–Fri: the printed poster ----------
    weekday: {
        key: "weekday",
        label: "Mon – Fri",
        short: "Mon – Fri",
        numbering: "perBlock",       // the poster restarts at 1 for the night shift
        dirs: {
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
                        title: "Night shift", tag: "night shift", tagTone: "night", dashed: true,
                        rota: ["VAN 1", "VAN 2"],
                        times: [
                            "19:00", "19:20", "19:40",
                            "20:00", "20:20", "20:40",
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
                        rota: ["VAN 2", "VAN 1"],
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
        },
    },

    // ---------- Sat–Sun: the notice ----------
    weekend: {
        key: "weekend",
        label: "Sat & Sun",
        short: "Sat & Sun",
        numbering: "continuous",     // one service, so the numbers just run on
        caveat: "The campus notice gives the start (7:30 AM), the 30-minute interval and both directions. " +
            "It does not give a last departure, and it says nothing about which vehicle runs which trip. " +
            "Everything through 6:30 PM below is the notice; the later block is an assumption that the " +
            "service keeps going as late as it does on weekdays. Check the board before counting on a late run.",
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

// Which service runs on a given date. 0 = Sunday, 6 = Saturday.
function dayKey(d) {
    const n = d.getDay();
    return (n === 0 || n === 6) ? "weekend" : "weekday";
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
function trips(sched, dir) {
    let n = 0;
    const blocks = dir.blocks.map((b) => {
        if (sched.numbering !== "continuous") n = 0;
        const rows = b.times.map((t, i) => ({
            no: ++n,
            time: t,
            mins: toMinutes(t),
            vehicle: b.rota ? b.rota[i % b.rota.length] : null,
            tag: b.tag || null,
            tagTone: b.tagTone || "day",
            assumed: !!b.assumed,
        }));
        return { ...b, rows };
    });
    return { blocks, all: blocks.reduce((acc, b) => acc.concat(b.rows), []) };
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

// ---------- rendering ----------

// The countdown card always speaks for TODAY, whatever timetable you are
// browsing below. A countdown that belonged to a different day would be
// worse than no countdown at all. If today is finished it rolls over to
// tomorrow's FIRST run — and tomorrow may be the other service entirely
// (Sunday night -> Monday), so the schedule is re-picked, not reused.
function renderNext(dirId, now) {
    let sched = SCHEDULES[todayKey()];
    let dir = sched.dirs[dirId];
    let data = trips(sched, dir);
    let upcoming = data.all.filter((t) => t.mins >= now).slice(0, 3);
    let tomorrow = false;

    if (!upcoming.length) {
        sched = SCHEDULES[tomorrowKey()];
        dir = sched.dirs[dirId];
        data = trips(sched, dir);
        upcoming = data.all.slice(0, 3);
        tomorrow = true;
    }

    const head = upcoming[0];
    const rest = upcoming.slice(1);

    return `
    <article class="next-card" data-dir="${dir.id}">
        <header class="next-head">
            <span class="next-dir">${dir.label}</span>
            <span class="next-from">from ${dir.from} · ${sched.label}</span>
        </header>
        <div class="next-lead">
            <span class="next-eta">${tomorrow ? "tomorrow" : untilLabel(head.mins, now)}</span>
            <span class="next-time">${to12h(head.time)}</span>
        </div>
        <div class="next-meta">
            ${head.tag ? `<span class="tag tag-${head.tagTone}">${head.tag}</span>` : ""}
            ${head.vehicle ? `<span class="next-veh">${head.vehicle}</span>` : ""}
        </div>
        <ul class="next-then">
            ${rest.map((t) => `
                <li>
                    <span class="then-time">${to12h(t.time)}</span>
                    <span class="then-eta">${tomorrow ? "&nbsp;" : untilLabel(t.mins, now)}</span>
                    <span class="then-veh">${t.vehicle || (t.assumed ? "assumed" : "")}</span>
                </li>`).join("")}
        </ul>
    </article>`;
}

// nextMins is computed ONCE for the whole direction and passed in — it is
// null when you are previewing the OTHER day's timetable, because none of
// those rows is "next" and saying so would be a lie. Computing it per block
// was wrong and showed: at 10:21 on a Saturday the second block happily
// labelled 7:00 PM as the next departure, because it was the first upcoming
// row *within that block*. Only one row in a direction is next.
function renderTable(dir, block, now, showVeh, nextMins) {

    return `
    <div class="sched-block${block.dashed ? " sched-dashed" : ""}">
        <h3 class="sched-title">${block.title}</h3>
        <div class="sched-scroll">
            <table class="sched">
                <thead>
                    <tr>
                        <th class="c-no">#</th>
                        <th class="c-time">Departs ${dir.from}</th>
                        <th class="c-route">Route</th>
                        ${showVeh ? '<th class="c-veh">Vehicle</th>' : ""}
                    </tr>
                </thead>
                <tbody>
                    ${block.rows.map((t) => {
                        const past = nextMins !== null && t.mins < now;
                        const isNext = t.mins === nextMins;
                        const cls = [past ? "past" : "", isNext ? "next" : ""].filter(Boolean).join(" ");
                        return `
                        <tr class="${cls}"${isNext ? ' id="next-' + dir.id + '"' : ""}>
                            <td class="c-no">${t.no}</td>
                            <td class="c-time">${to12h(t.time)}</td>
                            <td class="c-route">${dir.stops.join(" → ")}</td>
                            ${showVeh ? `<td class="c-veh">${t.vehicle || ""}</td>` : ""}
                        </tr>`;
                    }).join("")}
                </tbody>
            </table>
        </div>
    </div>`;
}

// Cached DOM handles — looked up once, not on every tick.
let elNext, elSched, elClock, elCaveat, elToday;

// Which timetable the TABLES are showing. Starts on today's, and the
// day switch lets you read the other one without lying about "next".
let viewKey = todayKey();

// Which trip is "next" in each direction. When this string changes,
// a bus has actually departed and the tables need rebuilding.
function nextKey(now) {
    const sched = SCHEDULES[todayKey()];
    return ["toCampus", "toDorms"]
        .map((id) => {
            const up = trips(sched, sched.dirs[id]).all.find((t) => t.mins >= now);
            return up ? up.time : "end";
        })
        .join("|");
}

function renderNextCards(now) {
    if (!elNext) return;
    elNext.innerHTML = ["toCampus", "toDorms"].map((id) => renderNext(id, now)).join("");
}

function renderTables(now) {
    if (!elSched) return;
    const sched = SCHEDULES[viewKey];
    const markNext = viewKey === todayKey();

    elSched.innerHTML = ["toCampus", "toDorms"]
        .map((id) => {
            const dir = sched.dirs[id];
            const data = trips(sched, dir);
            const showVeh = hasVehicles(dir);
            const up = markNext ? data.all.find((t) => t.mins >= now) : null;
            const nextMins = up ? up.mins : null;
            return `
            <section class="sched-col" data-dir="${dir.id}">
                <header class="sched-head">
                    <h2 class="sched-h2">${dir.label}</h2>
                    <p class="sched-route">${dir.stops.join("  →  ")}</p>
                </header>
                ${data.blocks.map((b) => renderTable(dir, b, now, showVeh, nextMins)).join("")}
            </section>`;
        })
        .join("");

    if (elCaveat) {
        elCaveat.innerHTML = sched.caveat || "";
        elCaveat.hidden = !sched.caveat;
    }
}

function renderClock() {
    if (!elClock) return;
    elClock.textContent = new Date()
        .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ---------- the tick ----------
// Everything on this page is a function of the current minute, so the
// tick is cheap: bail out unless the minute actually rolled over.
// The tables only get rebuilt when a bus genuinely departs.

let lastMinute = null;
let lastNextKey = null;

function tick(force) {
    const now = nowMinutes();
    if (!force && now === lastMinute) return;
    lastMinute = now;

    renderClock();
    renderNextCards(now);          // cheap, always — this is the countdown

    const key = nextKey(now);
    if (force || key !== lastNextKey) {
        lastNextKey = key;
        renderTables(now);         // expensive, only when a bus has gone
    }
}

function renderAll() {
    elNext = document.getElementById("next-wrap");
    elSched = document.getElementById("sched-wrap");
    elClock = document.getElementById("clock");
    elCaveat = document.getElementById("sched-caveat");
    elToday = document.getElementById("day-today");
    tick(true);
}

// The route line in the sticky bar. On a phone this is the only thing
// telling you which way round you are reading, so it has to track the
// toggle exactly and stay on screen while the table scrolls under it.
function setRoad(dirId) {
    const el = document.getElementById("road");
    if (!el) return;
    const dir = DIRS[dirId];
    if (!dir) return;
    const [from, ...rest] = dir.stops;
    el.innerHTML = `<span class="from">${from}</span>` +
        rest.map((s) => `<span class="arw">→</span><span class="via">${s}</span>`).join("");
}

// Mobile direction switcher — on narrow screens only one column shows.
function bindDirToggle() {
    const btns = document.querySelectorAll("[data-show]");
    btns.forEach((btn) => {
        btn.addEventListener("click", () => {
            btns.forEach((b) => b.classList.toggle("on", b === btn));
            document.body.dataset.dir = btn.dataset.show;
            setRoad(btn.dataset.show);
        });
    });
    setRoad(document.body.dataset.dir || "toCampus");
}

// Weekday / weekend switcher for the tables.
function bindDayToggle() {
    const btns = Array.from(document.querySelectorAll("[data-day]"));
    const paint = () => {
        btns.forEach((b) => b.classList.toggle("on", b.dataset.day === viewKey));
        if (elToday) {
            elToday.textContent = viewKey === todayKey()
                ? "today"
                : `today is ${SCHEDULES[todayKey()].label}`;
        }
    };
    btns.forEach((btn) => {
        btn.addEventListener("click", () => {
            viewKey = btn.dataset.day;
            paint();
            renderTables(nowMinutes());
        });
    });
    paint();
}

// Jump to the next departure.
//
// Two traps here, both of which bit on mobile:
//  1. On narrow screens one direction is display:none. querySelector
//     returns the FIRST tr.next in DOM order, which is always the
//     "To Campus" one — so with "To Dorms" showing, the button aimed at
//     a hidden row and scrollIntoView silently no-op'd. Pick the first
//     row that is actually rendered (offsetParent is null when hidden).
//  2. .sched-scroll sets overflow-x:auto, which makes the computed
//     overflow-y auto too, so it counts as a scroll container and
//     scrollIntoView walks into it. Do the page-scroll math directly
//     instead of asking the browser to guess which box to move.
function scrollToNext() {
    const visible = (el) => el && el.offsetParent !== null;

    const rows = Array.from(document.querySelectorAll(".sched tr.next"));
    let target = rows.find(visible);

    // After the last bus every row is "past" — and when you are previewing
    // the other day's timetable there is no "next" row by design — so fall
    // back to the top of whichever direction is on screen.
    if (!target) {
        target = Array.from(document.querySelectorAll(".sched-col")).find(visible);
    }
    if (!target) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rect = target.getBoundingClientRect();
    const y = rect.top + window.pageYOffset - window.innerHeight / 2 + rect.height / 2;

    window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });

    // Confirm the tap did something, even if the row was already on screen.
    target.classList.remove("flash");
    void target.offsetWidth;          // restart the animation
    target.classList.add("flash");
}

// ---------- keeping the page honest ----------
// A timer alone is not enough. Phones throttle or freeze timers on a
// backgrounded tab, and a page restored from the back/forward cache is
// resurrected frozen in time — so an untouched tab can happily show a
// "3 min" that went stale forty minutes ago. That is the one failure
// this page cannot have. So: tick on a timer AND re-tick, forced, on
// every event that means the page just came back in front of a human.
// The same applies across midnight into a Saturday: todayKey() is read
// on every tick, so the service swaps over on its own.

renderAll();
bindDirToggle();
bindDayToggle();
document.getElementById("jump-next")?.addEventListener("click", scrollToNext);

// Cheap: returns immediately unless the wall-clock minute rolled over.
setInterval(tick, 1000);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tick(true);
});
window.addEventListener("pageshow", () => tick(true));   // incl. bfcache restore
window.addEventListener("focus", () => tick(true));
window.addEventListener("online", () => tick(true));

const toggleBtn = document.getElementById("theme-toggle");
if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
        const theme = document.documentElement.getAttribute("data-theme");
        const newTheme = theme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
    });
}
