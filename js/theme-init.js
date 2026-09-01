// Runs synchronously in <head> BEFORE the body paints, so the theme is set
// before any styled element renders. Without this, you'd see a flash of the
// wrong theme on every page load.
(function () {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const stored = localStorage.getItem('theme');
    document.documentElement.setAttribute('data-theme', stored || (prefersDark ? 'dark' : 'light'));
})();
