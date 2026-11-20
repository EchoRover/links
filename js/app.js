// Installable app: registers the service worker (/sw.js) that keeps pages
// working offline. Everything about caching lives in sw.js.
//
// Also keeps the phone's top bar (theme-color) the same colour as the page.
// The site's ◐ toggle and the archive's own palette mean the right colour is
// whatever the page is actually painted, not the phone's light/dark setting,
// so it is read off <body> and re-read whenever the theme changes.
(function () {
  "use strict";

  function syncBar() {
    const body = document.body;
    if (!body) return;
    const bg = getComputedStyle(body).backgroundColor;
    if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") return;
    let metas = document.querySelectorAll('meta[name="theme-color"]');
    if (metas.length !== 1 || metas[0].hasAttribute("media")) {
      metas.forEach(function (m) { m.remove(); });
      const m = document.createElement("meta");
      m.name = "theme-color";
      document.head.appendChild(m);
      metas = [m];
    }
    metas[0].content = bg;
  }
  syncBar();
  window.addEventListener("load", syncBar);
  // The body fades its background over 0.4 s on a theme switch, so read it
  // again once the fade is over (and at the end of any transition on body).
  new MutationObserver(function () { syncBar(); setTimeout(syncBar, 450); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
  document.addEventListener("transitionend", function (e) { if (e.target === document.body) syncBar(); });

  // Hidden door to /admin: 10 quick taps on the "linkCS" wordmark (the text,
  // not the logo image, which is a link home and would reset the count).
  // /admin still asks for the password; this only saves typing the address.
  let taps = 0, tapTimer = null;
  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest(".brand-name")) return;
    taps++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(function () { taps = 0; }, 1500);   // a pause resets it
    if (taps >= 10) { taps = 0; location.href = "/admin"; }
  });

  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () { /* the site works without it */ });
  });
})();
