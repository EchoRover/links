// ============================================================
// BUS / VAN SHUTTLE SCHEDULE — KCA 1&2 · KCA 3 · Campus
// Transcribed from the printed shift poster (photographed 2026-08-19).
// The loop is one clockwise cycle:
//     KCA 1&2  ->  KCA 3  ->  Campus  ->  KCA 1&2  ->  ...
// so "Dorms to Campus" departs KCA 1&2 and "Campus to Dorms"
// departs Campus. KCA 3 is the middle stop on BOTH legs.
//
// Day fleet runs a 7-vehicle rota; night shift alternates two vans.
// Times are stored as "HH:MM" 24h for math, rendered as 12h.
// ============================================================

const DAY_ROTA = ["Coaster 1", "Coaster 2", "Coaster 3", "Bus 1", "Bus 2", "Bus 3", "Coaster 4"];

const SCHEDULE = {
    toCampus: {
        id: "toCampus",
        label: "Dorms → Campus",
        short: "To Campus",
        from: "KCA 1&2",
        stops: ["KCA 1&2", "KCA 3", "Campus"],
        day: [
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
        night: [
            "19:00", "19:20", "19:40",
            "20:00", "20:20", "20:40",
            "21:00", "21:20", "21:40",
            "22:00", "22:20", "22:40",
            "23:00", "23:20",
        ],
        nightRota: ["VAN 1", "VAN 2"],
    },

    toDorms: {
        id: "toDorms",
        label: "Campus → Dorms",
        short: "To Dorms",
        from: "Campus",
        stops: ["Campus", "KCA 1&2", "KCA 3"],
        day: [
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
        night: [
            "19:00", "19:20", "19:40",
            "20:00", "20:20", "20:40",
            "21:00", "21:20", "21:40",
            "22:00", "22:20", "22:40",
            "23:00", "23:20", "23:40",
            "24:00",
        ],
        nightRota: ["VAN 2", "VAN 1"],
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

// Build the full trip list for a direction: day trips numbered 1..n,
// then night trips numbered 1..m (the poster restarts numbering).
function trips(dir) {
    const day = dir.day.map((t, i) => ({
        no: i + 1,
        time: t,
        mins: toMinutes(t),
        vehicle: DAY_ROTA[i % DAY_ROTA.length],
        shift: "day",
    }));
    const night = dir.night.map((t, i) => ({
        no: i + 1,
        time: t,
        mins: toMinutes(t),
        vehicle: dir.nightRota[i % dir.nightRota.length],
        shift: "night",
    }));
    return { day, night, all: day.concat(night) };
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

function renderNext(dir, data, now) {
    // Upcoming = everything still ahead today. If nothing is left,
    // fall back to tomorrow's first departures so the card is never empty.
    let upcoming = data.all.filter((t) => t.mins >= now).slice(0, 3);
    let tomorrow = false;
    if (!upcoming.length) {
        upcoming = data.all.slice(0, 3);
        tomorrow = true;
    }

    const head = upcoming[0];
    const rest = upcoming.slice(1);

    return `
    <article class="next-card" data-dir="${dir.id}">
        <header class="next-head">
            <span class="next-dir">${dir.label}</span>
            <span class="next-from">from ${dir.from}</span>
        </header>
        <div class="next-lead">
            <span class="next-eta">${tomorrow ? "tomorrow" : untilLabel(head.mins, now)}</span>
            <span class="next-time">${to12h(head.time)}</span>
        </div>
        <div class="next-meta">
            <span class="tag tag-${head.shift}">${head.shift === "night" ? "night shift" : "day shift"}</span>
            <span class="next-veh">${head.vehicle}</span>
        </div>
        <ul class="next-then">
            ${rest.map((t) => `
                <li>
                    <span class="then-time">${to12h(t.time)}</span>
                    <span class="then-eta">${tomorrow ? "&nbsp;" : untilLabel(t.mins, now)}</span>
                    <span class="then-veh">${t.vehicle}</span>
                </li>`).join("")}
        </ul>
    </article>`;
}

function renderTable(dir, rows, now, title, isNight) {
    // The next departure gets marked so it can be highlighted + scrolled to.
    const nextMins = (() => {
        const up = rows.find((t) => t.mins >= now);
        return up ? up.mins : null;
    })();

    return `
    <div class="sched-block${isNight ? " sched-night" : ""}">
        <h3 class="sched-title">${title}</h3>
        <div class="sched-scroll">
            <table class="sched">
                <thead>
                    <tr>
                        <th class="c-no">#</th>
                        <th class="c-time">Departs ${dir.from}</th>
                        <th class="c-route">Route</th>
                        <th class="c-veh">Vehicle</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((t) => {
                        const past = t.mins < now;
                        const isNext = t.mins === nextMins;
                        const cls = [past ? "past" : "", isNext ? "next" : ""].filter(Boolean).join(" ");
                        return `
                        <tr class="${cls}"${isNext ? ' id="next-' + dir.id + (isNight ? "-n" : "") + '"' : ""}>
                            <td class="c-no">${t.no}</td>
                            <td class="c-time">${to12h(t.time)}</td>
                            <td class="c-route">${dir.stops.join(" → ")}</td>
                            <td class="c-veh">${t.vehicle}</td>
                        </tr>`;
                    }).join("")}
                </tbody>
            </table>
        </div>
    </div>`;
}

function renderAll() {
    const now = nowMinutes();

    const nextWrap = document.getElementById("next-wrap");
    const schedWrap = document.getElementById("sched-wrap");
    if (!nextWrap || !schedWrap) return;

    const dirs = [SCHEDULE.toCampus, SCHEDULE.toDorms];

    nextWrap.innerHTML = dirs
        .map((d) => renderNext(d, trips(d), now))
        .join("");

    schedWrap.innerHTML = dirs
        .map((d) => {
            const data = trips(d);
            return `
            <section class="sched-col" data-dir="${d.id}">
                <header class="sched-head">
                    <h2 class="sched-h2">${d.label}</h2>
                    <p class="sched-route">${d.stops.join("  →  ")}</p>
                </header>
                ${renderTable(d, data.day, now, "Day shift", false)}
                ${renderTable(d, data.night, now, "Night shift", true)}
            </section>`;
        })
        .join("");

    const clock = document.getElementById("clock");
    if (clock) {
        const d = new Date();
        clock.textContent = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
}

// Mobile direction switcher — on narrow screens only one column shows.
function bindDirToggle() {
    const btns = document.querySelectorAll("[data-show]");
    btns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const want = btn.dataset.show;
            btns.forEach((b) => b.classList.toggle("on", b === btn));
            document.body.dataset.dir = want;
        });
    });
}

function scrollToNext() {
    const target = document.querySelector(".sched tr.next");
    if (target) target.scrollIntoView({ block: "center", behavior: "smooth" });
}

renderAll();
bindDirToggle();
document.getElementById("jump-next")?.addEventListener("click", scrollToNext);

// Re-render every 30s so the countdown and the "next" highlight stay honest.
setInterval(renderAll, 30000);

// Theme toggle (same contract as the main page — one handler, no duplicates).
const toggleBtn = document.getElementById("theme-toggle");
if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
        const theme = document.documentElement.getAttribute("data-theme");
        const newTheme = theme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
    });
}
