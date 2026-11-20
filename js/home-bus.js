// Home page bus card: the next bus each way and a countdown. Times and the
// "which schedule runs today" logic come from js/bus-data.js, the same file
// the Bus page and the hall screen use, so the three can never disagree.
// (No "remind me" here yet: a calendar file freezes the time and the bus
// schedule changes often; reminders will be linkCS notifications that read
// the live schedule when they fire.)
(function () {
    "use strict";
    if (typeof SCHEDULES === "undefined" || typeof trips !== "function") return;
    const box = document.getElementById("hb-body");
    if (!box) return;

    // The next run in one direction, from the same rules as the Bus page.
    function nextRun(dirId, now) {
        let sched = SCHEDULES[todayKey()];
        let list = trips(sched, sched.dirs[dirId]).all.filter((t) => activeTrip(t, now, dirId));
        let day = serviceDate();
        if (!list.length) {
            sched = SCHEDULES[tomorrowKey()];
            list = trips(sched, sched.dirs[dirId]).all;
            day = serviceDate();
            day.setDate(day.getDate() + 1);
            if (!list.length) return null;
            return { t: list[0], day, tomorrow: true };
        }
        return { t: list[0], day, tomorrow: false };
    }

    function render() {
        const now = nowMinutes();
        let html = "";
        for (const dirId of ["toCampus", "toDorms"]) {
            const run = nextRun(dirId, now);
            if (!run) continue;
            const dir = DIRS[dirId];
            let inLabel;
            if (run.tomorrow) {
                // After midnight the bus day is still "last night" (ROLLOVER),
                // so "tomorrow" there is this morning: give the wait instead.
                const wait = run.t.mins + 24 * 60 - now;
                inLabel = wait < 12 * 60 ? "in " + untilLabel(run.t.mins + 24 * 60, now) : "tomorrow";
            }
            else if (run.t.mins <= now) inLabel = "leaving now";
            else inLabel = "in " + untilLabel(run.t.mins, now);
            html += `
            <div class="hb-row">
                <div class="hb-main">
                    <span class="hb-dir">${dir.short}</span>
                    <span class="hb-from">from ${dir.from}</span>
                </div>
                <div class="hb-when">
                    <span class="hb-time">${to12h(run.t.time)}</span>
                    <span class="hb-in">${inLabel}</span>
                </div>
            </div>`;
        }
        box.innerHTML = html || '<p class="tt-quiet">No buses listed.</p>';
    }

    render();
    let last = null;
    setInterval(() => {
        const m = nowMinutes();
        if (m !== last) { last = m; render(); }
    }, 15000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
})();
