// Notifications on the phone side: the bell (turn on / off, your reminders)
// and "Remind me" on bus runs. Server side is api/push/*; the service worker
// (sw.js) shows what arrives.
//
// iPhone rule (Apple's, not ours): a website can only notify once it is on the
// Home Screen. In a Safari tab, "Remind me" opens the install steps instead.
//
// Kept on this device: linkcs:push-id (this phone's id at linkCS, an opaque
// hash of the push address) and linkcs:reminders (which runs have a bell on).
(function () {
    "use strict";
    const ID = "linkcs:push-id";
    const REM = "linkcs:reminders";
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const ls = {
        get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
        set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
        del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
    };
    const count = (l) => { try { window.linkcsCount && window.linkcsCount("push: " + l); } catch (e) { /* ignore */ } };
    const keyOf = (dir, date, time) => `${dir}|${date}|${time}`;

    function reminders() {
        const all = ls.get(REM, {});
        const now = Date.now();
        let changed = false;
        for (const k of Object.keys(all)) if (all[k].leaves < now) { delete all[k]; changed = true; }
        if (changed) ls.set(REM, all);
        return all;
    }
    const isOn = () => supported && !!ls.get(ID, null) && Notification.permission === "granted";

    function b64ToBytes(s) {
        const pad = "=".repeat((4 - (s.length % 4)) % 4);
        const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
        return Uint8Array.from(raw, (c) => c.charCodeAt(0));
    }

    async function api(path, method, body) {
        const r = await fetch(path, { method, headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw Object.assign(new Error(j.error || `error ${r.status}`), { status: r.status });
        return j;
    }

    // Returns true when notifications are on (asking the phone if needed).
    async function enable() {
        if (!supported) {
            if (window.linkcsInstall) window.linkcsInstall.show("Notifications need linkCS on your Home Screen (Apple's rule). Add it, then tap Remind again.");
            else alertLine("This browser can't do notifications.");
            return false;
        }
        if (isOn()) return true;
        const perm = await Notification.requestPermission();
        if (perm !== "granted") { alertLine("Notifications are blocked for linkCS in this browser's settings."); count("denied"); return false; }
        const { key } = await api("/api/push/subscribe", "GET");
        if (!key) { alertLine("Notifications aren't set up on the server yet."); return false; }
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
        const j = await api("/api/push/subscribe", "POST", { subscription: sub.toJSON() });
        ls.set(ID, j.id);
        count("on");
        paint();
        return true;
    }

    async function disable() {
        const id = ls.get(ID, null);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) await sub.unsubscribe();
        } catch (e) { /* ignore */ }
        if (id) await api("/api/push/subscribe", "DELETE", { id }).catch(() => {});
        ls.del(ID); ls.del(REM);
        count("off");
        paint();
    }

    async function toggleBus(dir, date, time, btn) {
        const k = keyOf(dir, date, time);
        const all = reminders();
        if (btn) btn.disabled = true;
        try {
            if (all[k]) {
                await api("/api/push/remind", "DELETE", { id: ls.get(ID, null), rid: all[k].rid }).catch(() => {});
                delete all[k]; ls.set(REM, all);
                count("bus off");
            } else {
                if (!(await enable())) return;
                let j;
                try {
                    j = await api("/api/push/remind", "POST", { id: ls.get(ID, null), kind: "bus", dir, date, time });
                } catch (e) {
                    if (e.status === 404) { ls.del(ID); if (!(await enable())) return; j = await api("/api/push/remind", "POST", { id: ls.get(ID, null), kind: "bus", dir, date, time }); }
                    else throw e;
                }
                all[k] = { rid: j.rid, leaves: j.at + 10 * 60000, dir, date, time };
                ls.set(REM, all);
                count("bus on");
            }
        } catch (e) {
            alertLine(e.message === "that bus has left" ? "That bus has already left." : "Couldn't set the reminder: " + e.message);
        } finally {
            if (btn) btn.disabled = false;
            paint();
        }
    }

    // ---------- UI ----------
    const BELL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';

    // HTML for a "Remind me" button on one run; other scripts drop it in.
    function busButton(dir, date, time) {
        const on = isOn() && !!reminders()[keyOf(dir, date, time)];
        return `<button type="button" class="push-remind${on ? " on" : ""}" data-remind-bus="${dir}|${date}|${time}"
            aria-pressed="${on}" title="${on ? "Reminder set: tap to cancel" : "Notify me 10 minutes before this bus"}">${BELL}<span>${on ? "Set" : "Remind"}</span></button>`;
    }

    function paint() {
        const all = isOn() ? reminders() : {};
        document.querySelectorAll("[data-remind-bus]").forEach((b) => {
            const on = !!all[b.getAttribute("data-remind-bus")];
            b.classList.toggle("on", on);
            b.setAttribute("aria-pressed", String(on));
            const span = b.querySelector("span");
            if (span) span.textContent = on ? "Set" : "Remind";
        });
        const bell = document.getElementById("push-bell");
        if (bell) bell.classList.toggle("on", isOn());
        if (panel && !panel.hidden) fillPanel();
    }

    let toastTimer = null;
    function alertLine(text) {
        let t = document.getElementById("push-toast");
        if (!t) { t = document.createElement("div"); t.id = "push-toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
        t.textContent = text;
        t.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { t.hidden = true; }, 5000);
    }

    let panel = null;
    function fillPanel() {
        const on = isOn();
        const list = Object.values(reminders()).sort((a, b) => a.leaves - b.leaves);
        const fmt = (r) => {
            const [h, m] = r.time.split(":").map(Number);
            const hh = h % 24, ap = hh < 12 ? "AM" : "PM";
            return `${(hh % 12) || 12}:${String(m).padStart(2, "0")} ${ap} ${r.dir === "toCampus" ? "to Campus" : "to Dorms"}`;
        };
        panel.innerHTML = `
            <div class="push-panel-head"><b>Notifications</b>
                <button type="button" class="push-x" data-act="close" aria-label="Close">×</button></div>
            <p class="push-status">${!supported
                ? "On iPhone, notifications work once linkCS is on your Home Screen."
                : on ? "On for this device. Tap Remind on any bus." : "Off. Turn on to get a heads-up 10 minutes before a bus you pick."}</p>
            ${!supported ? '<button type="button" class="push-main" data-act="install">How to add linkCS</button>'
                : on ? '<button type="button" class="push-ghost" data-act="off">Turn off</button>'
                    : '<button type="button" class="push-main" data-act="on">Turn on</button>'}
            ${on ? `<p class="push-sub">Your reminders</p>${list.length
                ? `<ul class="push-list">${list.map((r) => `<li><span>${fmt(r)}</span>
                    <button type="button" class="push-cancel" data-remind-bus="${keyOf(r.dir, r.date, r.time)}" aria-label="Cancel">×</button></li>`).join("")}</ul>`
                : '<p class="push-none">None yet.</p>'}` : ""}`;
    }
    function openPanel(open) {
        if (!panel) {
            panel = document.createElement("div");
            panel.className = "push-panel";
            panel.hidden = true;
            document.body.appendChild(panel);
        }
        panel.hidden = !open;
        if (open) fillPanel();
    }

    document.addEventListener("click", (e) => {
        const r = e.target.closest && e.target.closest("[data-remind-bus]");
        if (r) {
            const [dir, date, time] = r.getAttribute("data-remind-bus").split("|");
            toggleBus(dir, date, time, r);
            return;
        }
        const bell = e.target.closest && e.target.closest("#push-bell");
        if (bell) { openPanel(!panel || panel.hidden); return; }
        const act = e.target.closest && e.target.closest(".push-panel [data-act]");
        if (act) {
            const a = act.getAttribute("data-act");
            if (a === "close") openPanel(false);
            if (a === "on") enable().catch((err) => alertLine("Couldn't turn on: " + err.message));
            if (a === "off") disable();
            if (a === "install" && window.linkcsInstall) { openPanel(false); window.linkcsInstall.show(); }
            return;
        }
        if (panel && !panel.hidden && !panel.contains(e.target)) openPanel(false);
    });

    // If notifications were switched off in the phone's settings, forget the id.
    if (supported && Notification.permission !== "granted" && ls.get(ID, null)) { ls.del(ID); ls.del(REM); }

    window.linkcsPush = { busButton, paint, enable, disable };
    document.addEventListener("DOMContentLoaded", paint);
})();
