// Usage counter: one "view" per page load and one "click" per link tapped,
// sent to /api/hit, which keeps counts only (see the header there).
//
// The device id is a random string kept in localStorage, never anything about
// the person. It only feeds a "how many different devices" count.
//
// Not counted: localhost, automated browsers, and any browser that opened a
// page with ?notrack=1 once (?notrack=0 undoes it). That is how the site's own
// maintainers keep their checking out of the numbers.
(function () {
  "use strict";
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
  if (navigator.webdriver) return;

  let store = null;
  try { store = window.localStorage; } catch { /* blocked: count without an id */ }

  try {
    const flag = new URLSearchParams(location.search).get("notrack");
    if (flag === "1") store && store.setItem("linkcs:notrack", "1");
    if (flag === "0") store && store.removeItem("linkcs:notrack");
    if (store && store.getItem("linkcs:notrack") === "1") return;
  } catch { /* storage refused: just count */ }

  let id = "";
  try {
    id = store ? store.getItem("linkcs:device") || "" : "";
    if (!id && store) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      store.setItem("linkcs:device", id);
    }
  } catch { id = ""; }

  function send(body) {
    const json = JSON.stringify(body);
    try {
      // sendBeacon survives the page being left, which is exactly when a
      // link click fires.
      if (navigator.sendBeacon &&
          navigator.sendBeacon("/api/hit", new Blob([json], { type: "application/json" }))) return;
    } catch { /* fall through */ }
    try {
      fetch("/api/hit", { method: "POST", body: json, keepalive: true,
                          headers: { "Content-Type": "application/json" } });
    } catch { /* counting must never break the page */ }
  }

  send({ t: "view", p: location.pathname, w: window.innerWidth, d: id,
         r: document.referrer || "" });

  // What a tapped link is called in the counts. A course card's links all
  // say BLACKBOARD, so the card's course code goes in front. data-hit on any
  // ancestor overrides everything.
  function label(a) {
    const tagged = a.closest("[data-hit]");
    if (tagged) return tagged.getAttribute("data-hit");
    const img = a.querySelector("img[alt]");
    const text = ((a.textContent || "").replace(/\s+/g, " ").trim() ||
                  a.getAttribute("aria-label") || a.title || (img && img.alt) || "").slice(0, 40);
    const card = a.closest(".box");
    const chip = card && card.querySelector(".course-chip");
    let host = "";
    try { host = new URL(a.href, location.href).hostname.replace(/^www\./, ""); } catch { /* skip */ }
    const name = text || host || "link";
    return chip ? `${chip.textContent.trim()} ${name}` : name;
  }

  document.addEventListener("click", function (e) {
    const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    send({ t: "click", p: location.pathname, d: id, l: label(a) });
  }, true);
})();
