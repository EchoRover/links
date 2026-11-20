// Install banner: on a phone, in a browser tab, linkCS asks to be added to
// the Home Screen, full screen, before the page. "Remind me later" hides it
// for SNOOZE_DAYS on this device. Never shown on a laptop, never inside the
// installed app.
//
//   iPhone        steps (Share, Add to Home Screen): Apple gives sites no
//                 install button
//   Android       a real "Install linkCS" button when Chrome offers one,
//                 else the menu steps
//   in-app        WhatsApp/Instagram/etc. browsers cannot install anything:
//                 copy the link and open it in Safari or Chrome
//
// Testing: ?install=1 shows it on any device and ignores the snooze;
// ?install=0 never shows it for this visit.
// Counts (in /stats "taps"): install: shown, install: later, install: tapped,
// install: installed.
(function () {
  "use strict";
  const SNOOZE_DAYS = 3;
  const KEY = "linkcs:install-later";
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  let standalone = false;
  try {
    standalone = matchMedia("(display-mode: standalone)").matches ||
      matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true;
  } catch (e) { /* old browser */ }
  if (standalone) return;

  // Other scripts (notifications) can open the same screen on demand, e.g.
  // when an iPhone taps "Remind me" before installing.
  let why = "";
  window.linkcsInstall = { show: (reason) => { why = reason || ""; render(); } };

  const q = new URLSearchParams(location.search).get("install");
  let auto = q !== "0";
  if (auto && q !== "1") {
    if (!(iOS || android)) auto = false;
    try {
      const until = Number(localStorage.getItem(KEY) || 0);
      if (until && Date.now() < until) auto = false;
    } catch (e) { /* storage blocked: show it */ }
  }

  const inApp = /FBAN|FBAV|Instagram|WhatsApp|Line\/|Snapchat|TikTok|LinkedInApp|; wv\)/.test(ua);
  const count = (l) => { try { window.linkcsCount && window.linkcsCount("install: " + l); } catch (e) { /* ignore */ } };

  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; if (box) render(); });
  window.addEventListener("appinstalled", () => { count("installed"); render(true); });

  const css = `
  #lc-install{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;
    padding:max(20px,env(safe-area-inset-top)) 16px max(20px,env(safe-area-inset-bottom));
    background:var(--bg,#F2EBDB);color:var(--fg,#0E1726);font-family:var(--font-sans,system-ui,-apple-system,sans-serif);overflow:auto}
  #lc-install .lc-box{width:100%;max-width:380px}
  #lc-install .lc-icon{width:72px;height:72px;border-radius:17px;display:block;margin:0 0 18px;box-shadow:0 6px 18px rgba(14,23,38,.18)}
  #lc-install h1{font-size:1.55rem;line-height:1.15;margin:0 0 10px;font-weight:800;letter-spacing:-.01em}
  #lc-install p{margin:0 0 14px;color:var(--fg-soft,#3B4659);line-height:1.45;font-size:.98rem}
  #lc-install ul{margin:0 0 18px;padding:0;list-style:none}
  #lc-install ul li{display:flex;gap:10px;align-items:flex-start;margin:0 0 9px;line-height:1.4;font-size:.96rem}
  #lc-install ul li b{flex:none;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;
    background:var(--coral-soft,#E2E8FB);color:var(--coral,#1E40AF);font-size:.78rem;margin-top:1px}
  #lc-install ol{margin:0 0 20px;padding:14px 16px 6px 34px;background:var(--bg-card,#FFFEFB);border:1px solid var(--rule-faint,rgba(14,23,38,.09));border-radius:14px}
  #lc-install ol li{margin:0 0 9px;line-height:1.45;font-size:.96rem}
  #lc-install ol b{font-weight:700;color:var(--fg,#0E1726)}
  #lc-install svg{width:18px;height:18px;vertical-align:-3px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  #lc-install button{display:block;width:100%;font:inherit;font-weight:700;font-size:1rem;padding:14px;border-radius:12px;border:0;cursor:pointer;margin:0 0 10px}
  #lc-install .lc-go{background:var(--coral,#1E40AF);color:#fff}
  #lc-install .lc-later{background:transparent;color:var(--fg-soft,#3B4659);font-weight:600}
  `;

  const SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  const PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  const DOTS = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>';

  let box = null;
  function render(installed) {
    if (!document.body) return;
    if (!box) {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
      box = document.createElement("div");
      box.id = "lc-install";
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-modal", "true");
      box.setAttribute("aria-label", "Add linkCS to your Home Screen");
      document.body.appendChild(box);
      document.documentElement.style.overflow = "hidden";
      count("shown");
    }
    const reason = why ? `<p><b>${why}</b></p>` : "";
    const whyList = reason + `<ul>
        <li><b>1</b><span>Bus reminders: a notification 10 minutes before your bus.</span></li>
        <li><b>2</b><span>Opens in one tap from your Home Screen, full screen, no browser bar.</span></li>
        <li><b>3</b><span>Bus times, the mess menu and your timetable still load with no signal.</span></li>
      </ul>`;
    let body;
    if (installed) {
      body = `<p>Installed. Open <b>linkCS</b> from your Home Screen from now on.</p>`;
    } else if (inApp) {
      body = whyList + `<p>This app browser can't install anything. Open linkCS in ${iOS ? "Safari" : "Chrome"}:</p>
        <button type="button" class="lc-go" data-act="copy">Copy link</button>`;
    } else if (iOS) {
      body = whyList + `<ol>
          <li>Tap <b>Share</b> ${SHARE} (bottom of Safari, or top right in Chrome).</li>
          <li>Scroll down and tap <b>Add to Home Screen</b> ${PLUS}.</li>
          <li>Open <b>linkCS</b> from your Home Screen.</li>
        </ol>`;
    } else if (deferred) {
      body = whyList + `<button type="button" class="lc-go" data-act="install">Install linkCS</button>`;
    } else {
      body = whyList + `<ol>
          <li>Tap the browser menu ${DOTS}.</li>
          <li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li>
          <li>Open <b>linkCS</b> from your Home Screen.</li>
        </ol>`;
    }
    box.innerHTML = `<div class="lc-box">
        <img class="lc-icon" src="/assets/app/icon-192.png" alt="">
        <h1>Get linkCS on your Home Screen</h1>
        ${body}
        <button type="button" class="lc-later" data-act="later">${installed ? "Close" : "Remind me later"}</button>
      </div>`;
  }

  document.addEventListener("click", async (e) => {
    const b = e.target.closest && e.target.closest("#lc-install [data-act]");
    if (!b) return;
    const act = b.getAttribute("data-act");
    if (act === "later") {
      count("later");
      try { localStorage.setItem(KEY, String(Date.now() + SNOOZE_DAYS * 864e5)); } catch (err) { /* ignore */ }
      box.remove();
      box = null;
      document.documentElement.style.overflow = "";
    } else if (act === "install" && deferred) {
      count("tapped");
      deferred.prompt();
      const r = await deferred.userChoice;
      deferred = null;
      if (r.outcome === "accepted") render(true); else render();
    } else if (act === "copy") {
      count("copied link");
      const url = location.origin + location.pathname;
      try { await navigator.clipboard.writeText(url); b.textContent = "Copied. Paste it in " + (iOS ? "Safari" : "Chrome"); }
      catch (err) { b.textContent = url; }
    }
  });

  if (auto) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => render());
    else render();
  }
})();
