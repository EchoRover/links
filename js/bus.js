// ============================================================
// BUS PAGE — rendering.
//
// The timetable itself and every time calculation live in
// js/bus-data.js, which this file requires and which screen.html
// (the campus hall display) loads too. Nothing below decides WHEN a
// bus leaves; it only decides how that is drawn.
// ============================================================

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
    let upcoming = data.all.filter((t) => activeTrip(t, now, dirId)).slice(0, 3);
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
    const isEnRoute = !tomorrow && head.mins < now;

    // If the wait is long because runs were cancelled, SAY SO. A silent
    // "45 min" during the prayer break reads as the page being broken, and a
    // silent 40-minute hole at 9pm reads the same way to someone who can see
    // 9:00 PM sitting right there in the table.
    const gap = sched.noService;
    const skipped = tomorrow ? []
        : data.every.filter((t) => t.cancelled && t.mins >= now && t.mins < head.mins);
    const gapNote = !skipped.length ? ""
        : gap && skipped.some((t) => t.why === gap.reason)
            ? `no trips ${to12h(gap.from)} – ${to12h(gap.to)} · ${gap.reason}`
            : `${skipped.map((t) => to12h(t.time)).join(", ")} cancelled · ${skipped[0].why}`;

    const etaText = tomorrow ? "tomorrow" : (isEnRoute ? "en route" : untilLabel(head.mins, now));
    const fromText = isEnRoute ? `left ${dir.from} at ${to12h(head.time)}` : `from ${dir.from} · ${sched.label}`;

    return `
    <article class="next-card" data-dir="${dir.id}">
        <header class="next-head">
            <span class="next-dir">${dir.label}</span>
            <span class="next-from">${fromText}</span>
        </header>
        <div class="next-lead">
            <span class="next-eta">${etaText}</span>
            <span class="next-time">${to12h(head.time)}</span>
        </div>
        <div class="next-meta">
            ${head.tag ? `<span class="tag tag-${head.tagTone}">${head.tag}</span>` : ""}
            ${head.vehicle ? `<span class="next-veh">${head.vehicle}</span>` : ""}
        </div>
        ${gapNote ? `<p class="next-gap">${gapNote}</p>` : ""}
        ${dir.id === "toCampus" ? `<p class="next-kca3">
            <span class="kca3-stop">KCA 3</span>
            <span class="kca3-win">${to12h(addMins(head.time, KCA3_LEG.lo))} – ${to12h(addMins(head.time, KCA3_LEG.hi))}</span>
            <a class="kca3-est" href="#notes">estimate</a>
        </p>` : ""}
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
        ${block.stops ? `<p class="sched-route sched-route-block">${block.stops.join("  →  ")}</p>` : ""}
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
                        const past = nextMins !== null && t.mins < now && t.mins !== nextMins && !t.cancelled;
                        const isNext = !t.cancelled && t.mins === nextMins;
                        const cls = [past ? "past" : "", isNext ? "next" : "",
                                     t.cancelled ? "cancelled" : ""].filter(Boolean).join(" ");
                        return `
                        <tr class="${cls}"${isNext ? ' id="next-' + dir.id + '"' : ""}>
                            <td class="c-no">${t.no}</td>
                            <td class="c-time">${to12h(t.time)}</td>
                            <td class="c-route">${(block.stops || dir.stops).join(" → ")}</td>
                            ${showVeh ? `<td class="c-veh">${t.cancelled ? "no trip" : (t.vehicle || "")}</td>` : ""}
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
            const up = trips(sched, sched.dirs[id]).all.find((t) => activeTrip(t, now, id));
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
            const up = markNext ? data.all.find((t) => activeTrip(t, now, id)) : null;
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
