// ============================================================
// CAMPUS HALL SCREEN — the shuttle board.
//
// A read-only display for a TV mounted in a campus hall. Nobody
// taps it, nobody scrolls it, and nobody restarts it for weeks, so
// this file is written against three constraints the website does
// not have:
//
//   1. READ AT DISTANCE. One question only — "when is the next bus,
//      each way" — answered in type large enough to read walking
//      past. Everything that is not a time or a countdown is small.
//   2. NEVER SCROLL. The whole board must fit one viewport at any
//      aspect ratio, so the layout is sized in vh/vmin, not px, and
//      the row count is fixed rather than "as many as fit".
//   3. NEVER GO STALE SILENTLY. A frozen board is worse than a dark
//      one: it looks authoritative and it lies. So it re-derives from
//      the wall clock every second, and if that ever stops happening
//      the board says so instead of showing an old time.
//
// The timetable and every time calculation come from js/bus-data.js,
// shared with bus.html. This file must never contain a departure time.
// ============================================================

const ROWS = 5;              // 1 headline + 4 following departures
const RELOAD_AFTER_MIN = 60; // pick up a redeploy without anyone touching the TV

// ---------- the one query this board answers ----------

// The next ROWS departures in a direction.
//
// Unlike the website's card, this one TOPS UP from tomorrow's service when
// today's runs out. The site shows three and you can scroll for the rest; a
// wall board has a fixed five rows and nothing else to look at, so at 23:50
// "12:00 AM" followed by four em-dashes is most of the board saying nothing.
// Tomorrow may also be a different service entirely (Sunday night into
// Monday), so it is re-picked rather than reused.
function board(dirId, now) {
    const today = SCHEDULES[todayKey()];
    const todayDir = today.dirs[dirId];
    const todayData = trips(today, todayDir);
    const left = todayData.all.filter((t) => activeTrip(t, now, dirId)).slice(0, ROWS);

    let rows = left.map((t) => ({ ...t, tomorrow: false }));
    let sched = today;
    let dir = todayDir;

    if (rows.length < ROWS) {
        const tmr = SCHEDULES[tomorrowKey()];
        const tmrDir = tmr.dirs[dirId];
        const more = trips(tmr, tmrDir).all
            .slice(0, ROWS - rows.length)
            .map((t) => ({ ...t, tomorrow: true }));
        rows = rows.concat(more);
        // The service label under the panel describes the headline row, so
        // it follows tomorrow only when today has nothing left at all.
        if (!left.length) { sched = tmr; dir = tmrDir; }
    }

    const head = rows[0];

    // A cancelled run has to be explained wherever it falls INSIDE the
    // window on screen, not just before the headline. At 20:55 the 21:40 run
    // is unstaffed and sits between the second and third rows: without this
    // the board silently jumps 9:20 -> 10:00 and someone holding the printed
    // poster concludes the screen is broken rather than that the run is off.
    const last = rows[rows.length - 1];
    const windowEnd = last.tomorrow ? 24 * 60 : last.mins;
    const gap = today.noService;
    const skipped = todayData.every.filter(
        (t) => t.cancelled && t.mins >= now && t.mins <= windowEnd);
    const note = !skipped.length ? ""
        : gap && skipped.some((t) => t.why === gap.reason)
            ? `no trips ${to12h(gap.from)} – ${to12h(gap.to)} · ${gap.reason}`
            : `${skipped.map((t) => to12h(t.time)).join(", ")} cancelled · ${skipped[0].why}`;

    return { sched, dir, head, rest: rows.slice(1), tomorrow: head.tomorrow, note };
}

// ---------- rendering ----------

// "18:00" -> big "6:00" + a smaller "PM". The meridiem carries almost no
// information on a board where everything is within a few hours of now, so
// at headline size it just steals width from the digits people read.
function bigTime(hhmm) {
    const [clock, mer] = to12h(hhmm).split(" ");
    return `<span class="hh">${clock}</span><span class="mer">${mer}</span>`;
}

// "en route" on its own is a dead end: the bus left, and then what? Standing
// at the stop you want the next fact, which is where it is going and when it
// gets there. Only ONE leg has ever been timed - KCA 1&2 -> KCA 3 on the
// outbound run, and only as a 3-7 minute window (see KCA3_LEG in bus-data.js).
// The Campus -> KCA 1&2 -> KCA 3 leg has NOT been timed, so that panel names
// the next stop and gives no number rather than inventing one.
function enRouteLine(dir, head, now) {
    const gone = now - head.mins;
    const ago = gone < 1 ? `just left ${dir.from}` : `left ${dir.from} ${gone} min ago`;

    if (dir.id === "toCampus") {
        const lo = to12h(addMins(head.time, KCA3_LEG.lo)).split(" ")[0];
        const hi = to12h(addMins(head.time, KCA3_LEG.hi));
        return `${ago} · KCA 3 about ${lo}–${hi}`;
    }
    return `${ago} · next stop ${dir.stops[1]}`;
}

function renderPanel(dirId, now) {
    const { sched, dir, head, rest, tomorrow, note } = board(dirId, now);
    const enRoute = !tomorrow && head.mins < now;

    // The countdown is the number people actually read, so it carries the
    // state. "en route" matters at a stop — the bus left but has not passed
    // KCA 3 yet — and is a different fact from "3 min".
    const eta = tomorrow ? "tomorrow" : enRoute ? "en route" : untilLabel(head.mins, now);
    const urgent = !tomorrow && !enRoute && head.mins - now <= 5;

    return `
    <section class="panel" data-dir="${dir.id}">
        <h2 class="panel-dir">${dir.label}</h2>
        <p class="panel-from">from ${dir.from}</p>

        <div class="lead ${urgent ? "lead-urgent" : ""}">
            <span class="lead-time">${bigTime(head.time)}</span>
            <span class="lead-eta">${eta}</span>
        </div>

        ${enRoute ? `<p class="panel-enroute">${enRouteLine(dir, head, now)}</p>` : ""}
        ${note ? `<p class="panel-note">${note}</p>` : ""}

        <ul class="then">
            ${rest.map((t) => `
            <li>
                <span class="then-time">${to12h(t.time)}</span>
                <span class="then-eta">${untilLabel(t.mins, now)}</span>
            </li>`).join("")}
            ${Array.from({ length: Math.max(0, ROWS - 1 - rest.length) },
        () => `<li class="then-empty"><span class="then-time">—</span><span class="then-eta"></span></li>`).join("")}
        </ul>

        <p class="panel-service">${tomorrow ? "tomorrow · " : ""}${sched.label}</p>
    </section>`;
}

function renderClock(d) {
    document.getElementById("clock").textContent = to12h(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    );
    document.getElementById("dayname").textContent =
        d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

let lastMinute = -1;

// Everything on this board is a function of the current minute, so the
// expensive half only runs when the minute rolls over. The clock is cheap
// and runs every tick so the display never looks frozen.
function tick(force) {
    const d = new Date();
    renderClock(d);

    const now = d.getHours() * 60 + d.getMinutes();
    if (!force && now === lastMinute) return;
    lastMinute = now;

    // The board hangs in a campus hall, so the reader is standing ON campus:
    // the bus they need is the one leaving here. Campus -> dorms goes first
    // (left on a wide screen, top on a vertical one).
    document.getElementById("panels").innerHTML =
        renderPanel("toDorms", now) + renderPanel("toCampus", now);
    document.body.classList.remove("stale");
}

// A TV left on for a month will outlive several deploys of this page.
// Reload on a schedule so a fix reaches the wall without anyone
// finding a keyboard — but only from a full minute, never mid-render.
function scheduleReload() {
    setTimeout(() => location.reload(), RELOAD_AFTER_MIN * 60 * 1000);
}

// The failure this board cannot have is showing a stale time confidently.
// If the tick has not run for two minutes — the tab was throttled, the
// machine slept, something threw — grey the board out so a passer-by can
// see it is not current rather than trusting a number from an hour ago.
function watchdog() {
    setInterval(() => {
        const d = new Date();
        const now = d.getHours() * 60 + d.getMinutes();
        let behind = now - lastMinute;
        if (behind < 0) behind += 24 * 60;
        if (behind >= 2) document.body.classList.add("stale");
    }, 15000);
}

tick(true);
setInterval(tick, 1000);
watchdog();
scheduleReload();
document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(true); });
window.addEventListener("pageshow", () => tick(true));
window.addEventListener("focus", () => tick(true));
