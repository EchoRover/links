// ============================================================
// halloween-init.js: switches the Halloween week theme on or off.
//
// Runs synchronously in <head> right after theme-init.js, so the class is
// on <html> before the body paints (no flash of the normal site). All the
// styling hangs off html.halloween in styles.css; the ghosts, pumpkin and
// bats live in halloween.js, which loads deferred and does nothing unless
// this script turned the class on.
//
//   on    25 Oct 00:00 to 31 Oct 23:59, Gulf time (+04:00), off after
//   ?spooky=1  preview it any day      ?spooky=0  switch it off
//
// The URL override is kept in sessionStorage so it survives clicking
// around the site for the rest of the visit.
// ============================================================

(function () {
    const START = Date.parse('2026-10-25T00:00:00+04:00');
    const END = Date.parse('2026-11-01T00:00:00+04:00');   // exclusive

    let flag = new URLSearchParams(location.search).get('spooky');
    try {
        if (flag === '1' || flag === '0') sessionStorage.setItem('spooky', flag);
        else flag = sessionStorage.getItem('spooky');
    } catch (e) { /* private window: the URL flag still works for this page */ }

    const now = Date.now();
    const on = flag === '1' || (flag !== '0' && now >= START && now < END);
    if (!on) return;

    const root = document.documentElement;
    root.classList.add('halloween');

    // The night palette is built on the dark theme, so start there. The
    // theme toggle still works: if someone picks light (sun on a phone
    // screen is real), remember that for the visit instead of fighting it.
    let keepLight = false;
    try { keepLight = sessionStorage.getItem('spooky-theme') === 'light'; } catch (e) {}
    if (!keepLight) root.setAttribute('data-theme', 'dark');
    new MutationObserver(() => {
        try { sessionStorage.setItem('spooky-theme', root.getAttribute('data-theme')); } catch (e) {}
    }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
})();
