// Home page bus card: the next bus each way and a countdown. Times and the
// "which schedule runs today" logic come from js/bus-data.js, the same file
// the Bus page and the hall screen use, so the three can never disagree.
// "Remind me" comes from js/push.js (a linkCS notification 10 min before,
// re-checked against the timetable when it fires).
//
// One direction, by location: on campus you want Campus -> Dorms, anywhere
// else Dorms -> Campus. The position is compared with the campus point ON
// THE PHONE and never sent anywhere. The browser only asks after a tap on
// "Use my location"; once allowed, later visits read it quietly.
// Campus point: OpenStreetMap node for IIT Delhi - Abu Dhabi (24.39505,
// 54.58740). The campus is about 1 km across and Khalifa City A is 3.7 km
// away, so a 1.2 km circle cannot mistake the dorms for campus.
(function () {
    "use strict";
    if (typeof SCHEDULES === "undefined" || typeof trips !== "function") return;
    const box = document.getElementById("hb-body");
    if (!box) return;

    const CAMPUS = { lat: 24.3950507, lon: 54.5874047 };
    const RADIUS_KM = 1.2;
    const FRESH_MS = 10 * 60000;             // reuse a fix for 10 minutes
    const POS = "linkcs:bus-where";           // {onCampus, at}
    const ls = {
        get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
    };
    let where = ls.get(POS);                  // last known, may be stale
    let showBoth = false;
    let locating = false;
    const geo = "geolocation" in navigator;

    function km(a, b) {
        const R = 6371, rad = Math.PI / 180;
        const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(h));
    }
    function locate() {
        if (!geo || locating) return;
        locating = true;
        render();
        navigator.geolocation.getCurrentPosition((p) => {
            locating = false;
            const d = km(CAMPUS, { lat: p.coords.latitude, lon: p.coords.longitude });
            where = { onCampus: d <= RADIUS_KM, at: Date.now() };
            ls.set(POS, where);
            showBoth = false;
            render();
        }, () => { locating = false; render(); }, { enableHighAccuracy: false, maximumAge: FRESH_MS, timeout: 10000 });
    }
    // Already allowed earlier: refresh quietly (no prompt) whenever the fix is
    // older than FRESH_MS and the page comes back to the front.
    function refreshIfAllowed() {
        if (!geo || !navigator.permissions || !navigator.permissions.query) return;
        navigator.permissions.query({ name: "geolocation" }).then((st) => {
            if (st.state === "granted" && !(where && Date.now() - where.at < FRESH_MS)) locate();
        }).catch(() => {});
    }
    refreshIfAllowed();
    box.addEventListener("click", (e) => {
        const a = e.target.closest("[data-hb]");
        if (!a) return;
        const act = a.getAttribute("data-hb");
        if (act === "locate") locate();
        if (act === "both") { showBoth = true; render(); }
        if (act === "one") { showBoth = false; render(); }
    });

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
        const known = where && Date.now() - where.at < 6 * 3600000;     // a fix from the last 6 h
        const only = known && !showBoth ? [where.onCampus ? "toDorms" : "toCampus"] : ["toCampus", "toDorms"];
        for (const dirId of only) {
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
                ${window.linkcsPush && run.t.mins > now + 1 - (run.tomorrow ? 24 * 60 : 0)
                    ? window.linkcsPush.busButton(dirId, isoDate(run.day), run.t.time) : ""}
            </div>`;
        }
        let foot = "";
        if (locating) foot = `<span class="hb-note">Finding where you are…</span>`;
        else if (known && !showBoth) foot = `<span class="hb-note">${where.onCampus ? "You're on campus" : "You're off campus"}</span>
            <button type="button" class="hb-link" data-hb="both">Show both</button>`;
        else if (known) foot = `<button type="button" class="hb-link" data-hb="one">Just mine</button>`;
        else if (geo) foot = `<button type="button" class="hb-link" data-hb="locate" title="Shows just your direction. Checked on your phone, never sent anywhere">Use my location</button>`;
        box.innerHTML = (html || '<p class="tt-quiet">No buses listed.</p>') + (foot ? `<div class="hb-foot">${foot}</div>` : "");
    }

    render();
    let last = null;
    setInterval(() => {
        const m = nowMinutes();
        if (m !== last) { last = m; render(); }
    }, 15000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { render(); refreshIfAllowed(); } });
})();
