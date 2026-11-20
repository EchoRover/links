// Installable app: registers the service worker (/sw.js) that keeps pages
// working offline. Everything about caching lives in sw.js.
(function () {
  "use strict";
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () { /* the site works without it */ });
  });
})();
