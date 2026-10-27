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
// around the site for the rest of the visit. A visitor can also switch
// the theme off for good from the pumpkin panel (localStorage
// 'spooky-off'); the URL flags still override that. When the theme is
// off by that choice during the week, window.HALLOWEEN_OFF is set so
// halloween.js can leave a small pumpkin to switch it back on.
// ============================================================

(function () {
    const START = Date.parse('2026-10-25T00:00:00+04:00');
    const END = Date.parse('2026-11-01T00:00:00+04:00');   // exclusive

    let flag = new URLSearchParams(location.search).get('spooky');
    try {
        if (flag === '1' || flag === '0') sessionStorage.setItem('spooky', flag);
        else flag = sessionStorage.getItem('spooky');
    } catch (e) { /* private window: the URL flag still works for this page */ }

    let optedOut = false;
    try { optedOut = localStorage.getItem('spooky-off') === '1'; } catch (e) {}

    const now = Date.now();
    const week = now >= START && now < END;
    const on = flag === '1' || (flag !== '0' && !optedOut && week);
    if (!on) {
        if (optedOut && flag !== '0' && week) window.HALLOWEEN_OFF = true;
        return;
    }

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
