// /stats: the private usage page. Reads /api/hit with the stats password
// (STATS_KEY in Vercel; Keychain "linkcs-stats-key" on the maintainer's Mac).
// The password is kept in this browser's localStorage after the first entry;
// "forget password" on the page clears it.
//
// Everything that came from visitors (link labels, referrer hosts) is escaped
// before it touches the page: counting is open to anyone, so those strings are
// untrusted.
(function () {
    "use strict";

    const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    const API = LOCAL ? "https://linkcs.vercel.app/api/hit" : "/api/hit";
    const KEY = "linkcs:stats-key";
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const fmt = (n) => Number(n || 0).toLocaleString("en-US");
    const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayLabel = (iso) => {
        const [y, m, d] = iso.split("-").map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d));
        return `${DOW[dt.getUTCDay()]} ${d} ${MON[m - 1]}`;
    };
    const PAGE_NAMES = { "/": "Home", "/bus": "Bus", "/mess": "Mess", "/mess-next": "Mess (next)",
        "/rooms": "Free Rooms", "/week": "Timetable", "/timetables": "All timetables", "/predict": "Predict",
        "/3d": "3D", "/both": "3D (M3+M4)", "/campus": "3D campus", "/m3": "3D M3", "/m4": "3D M4",
        "/archive": "Year 2 archive", other: "Other" };

    let key = "";
    try { key = localStorage.getItem(KEY) || ""; } catch (e) { /* private window */ }
    let days = 14;

    // ---------- theme toggle, same as every other page ----------
    const toggle = $("theme-toggle");
    if (toggle) toggle.addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (e) { /* ignore */ }
    });

    // ---------- tooltip ----------
    const tip = document.createElement("div");
    tip.className = "st-tip";
    tip.hidden = true;
    document.body.appendChild(tip);
    function showTip(el) {
        const r = el.getBoundingClientRect();
        tip.textContent = el.getAttribute("data-tip");
        tip.style.left = `${r.left + r.width / 2}px`;
        tip.style.top = `${r.top}px`;
        tip.hidden = false;
    }
    document.addEventListener("pointerover", (e) => {
        const el = e.target.closest && e.target.closest("[data-tip]");
        if (el) showTip(el); else tip.hidden = true;
    });
    document.addEventListener("focusin", (e) => {
        const el = e.target.closest && e.target.closest("[data-tip]");
        if (el) showTip(el);
    });
    document.addEventListener("focusout", () => { tip.hidden = true; });
    window.addEventListener("scroll", () => { tip.hidden = true; }, { passive: true });

    // ---------- gate ----------
    function gate(msg) {
        $("st-gate").hidden = false;
        $("st-body").hidden = true;
        $("st-range").hidden = true;
        $("st-err").textContent = msg || "";
        $("st-key").focus();
    }
    $("st-form").addEventListener("submit", (e) => {
        e.preventDefault();
        key = $("st-key").value.trim();
        load();
    });

    // ---------- range ----------
    $("st-range").addEventListener("click", (e) => {
        const b = e.target.closest("button[data-days]");
        if (!b) return;
        days = Number(b.dataset.days);
        $("st-range").querySelectorAll("button").forEach((x) =>
            x.setAttribute("aria-pressed", String(x === b)));
        load();
    });

    async function load() {
        if (!key) return gate();
        let res;
        try {
            res = await fetch(`${API}?days=${days}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
        } catch (e) {
            return gate("Could not reach the stats endpoint. Offline?");
        }
        if (res.status === 401) {
            try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
            key = "";
            return gate("Wrong password.");
        }
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || !data.ok) return gate(`The endpoint said: ${esc((data && data.error) || res.status)}`);
        try { localStorage.setItem(KEY, key); } catch (e) { /* ignore */ }
        $("st-gate").hidden = true;
        $("st-range").hidden = false;
        render(data);
    }

    // ---------- pieces ----------
    function sum(obj) { return Object.values(obj || {}).reduce((a, b) => a + Number(b || 0), 0); }
    function merge(rows, field) {
        const out = {};
        for (const r of rows) for (const [k, v] of Object.entries(r[field] || {})) out[k] = (out[k] || 0) + Number(v);
        return out;
    }
    function rowsHTML(counter, name, limit) {
        const list = Object.entries(counter).sort((a, b) => b[1] - a[1]).slice(0, limit || 12);
        if (!list.length) return '<p class="st-empty">Nothing yet.</p>';
        const top = list[0][1] || 1;
        const total = sum(counter) || 1;
        return '<div class="st-rows">' + list.map(([k, v]) => `
            <div class="st-row">
                <span class="k" title="${esc(name ? name(k) : k)}">${esc(name ? name(k) : k)}</span>
                <span class="v">${fmt(v)} <small>${Math.round((v / total) * 100)}%</small></span>
                <span class="b"><i style="width:${Math.max(2, (v / top) * 100)}%"></i></span>
            </div>`).join("") + "</div>";
    }
    function colsHTML(items, axisLeft, axisRight) {
        const top = Math.max(1, ...items.map((x) => x.v));
        return `<div class="st-cols">` + items.map((x) => `
            <span class="st-col${x.v ? "" : " zero"}" tabindex="0" data-tip="${esc(x.tip)}" aria-label="${esc(x.tip)}">
                <i style="height:${(x.v / top) * 100}%"></i>
            </span>`).join("") + `</div>
            <div class="st-axis"><span>${esc(axisLeft)}</span><span>${esc(axisRight)}</span></div>`;
    }
    function card(title, inner, full) {
        return `<section class="st-card${full ? " st-full" : ""}"><h2>${esc(title)}</h2>${inner}</section>`;
    }

    function render(data) {
        const rows = data.days.slice().reverse();          // oldest first
        const views = merge(rows, "views");
        const totalViews = sum(views);
        const kind = merge(rows, "kind");
        const mode = merge(rows, "mode");
        const ref = merge(rows, "ref");
        const clicks = merge(rows, "clicks");
        const hours = merge(rows, "hours");
        const modeTotal = sum(mode);
        const phones = (kind.phone || 0) + (kind.tablet || 0);

        const kpis = `
            <div class="st-kpis">
                <div class="st-card st-kpi"><div class="n">${fmt(totalViews)}</div><div class="l">page views</div></div>
                <div class="st-card st-kpi"><div class="n">${fmt(data.devicesInWindow)}</div><div class="l">different devices</div></div>
                <div class="st-card st-kpi"><div class="n">${totalViews ? Math.round((phones / totalViews) * 100) : 0}%</div><div class="l">on phones</div></div>
                <div class="st-card st-kpi"><div class="n">${modeTotal ? Math.round(((mode.app || 0) / modeTotal) * 100) : 0}%</div><div class="l">from the installed app</div></div>
            </div>`;

        const perDay = rows.map((r) => {
            const v = sum(r.views);
            return { v, tip: `${dayLabel(r.day)}: ${fmt(v)} views, ${fmt(r.devices)} devices` };
        });
        const perHour = Array.from({ length: 24 }, (_, h) => {
            const v = Number(hours[String(h)] || 0);
            const h12 = (h % 12) || 12;
            return { v, tip: `${h12} ${h < 12 ? "AM" : "PM"}: ${fmt(v)} views` };
        });

        const linkName = (k) => {
            const i = k.indexOf(" ");
            const page = k.slice(0, i), label = k.slice(i + 1);
            return `${label}  ·  on ${PAGE_NAMES[page] || page}`;
        };
        const kindName = (k) => ({ phone: "Phone", tablet: "Tablet", desktop: "Laptop / desktop", unknown: "Unknown" }[k] || k);
        const modeName = (k) => ({ app: "Installed app", browser: "Browser tab" }[k] || k);
        const refName = (k) => ({ direct: "Typed / bookmark / app", internal: "Another linkCS page" }[k] || k);

        const table = `<details class="st-card st-full"><summary>Table: per day</summary>
            <table class="st-table"><thead><tr><th>Day</th><th>Views</th><th>Devices</th></tr></thead><tbody>` +
            data.days.map((r) => `<tr><td>${esc(dayLabel(r.day))}</td><td>${fmt(sum(r.views))}</td><td>${fmt(r.devices)}</td></tr>`).join("") +
            `</tbody></table></details>`;

        $("st-body").innerHTML = kpis + `<div class="st-grid">` +
            card("Views per day", colsHTML(perDay, rows.length ? dayLabel(rows[0].day) : "", rows.length ? dayLabel(rows[rows.length - 1].day) : ""), true) +
            card("Pages", rowsHTML(views, (k) => PAGE_NAMES[k] || k, 15)) +
            card("Time of day (Abu Dhabi)", colsHTML(perHour, "12 AM", "11 PM")) +
            card("Device", rowsHTML(kind, kindName)) +
            card("Installed app or browser", modeTotal ? rowsHTML(mode, modeName) : '<p class="st-empty">Counted from 20 Nov 2026 on.</p>') +
            card("Most tapped links", rowsHTML(clicks, linkName, 25), true) +
            card("Came from", rowsHTML(ref, refName)) +
            table + `</div>
            <p class="st-foot">Your own visits are not counted once you open any page with
            <code>?notrack=1</code>. Counting started Fri 20 Nov 2026 (installed-app
            counts the same evening); days are Abu Dhabi time. <button type="button" id="st-forget">Forget password on this browser</button></p>`;
        $("st-body").hidden = false;
        $("st-forget").addEventListener("click", () => {
            try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
            key = "";
            gate("Password forgotten on this browser.");
        });
    }

    load();
})();
