// linkCS service worker: makes the site work offline once it has been opened.
//
// The rule is NETWORK FIRST for everything. Bus times, the mess menu and the
// timetable change, and a cache that serves yesterday's answer while the
// network is fine would be worse than no app at all. The cache is only the
// fallback: no signal (or a network that hangs past TIMEOUT) gets the last
// copy this phone saw.
//
// On install it fetches the core pages and every same-origin script and
// stylesheet they load, so Bus and Mess work offline even if this phone has
// only ever opened the home page.
//
// Not cached: /api/* (live data, predictions, counts) and anything that is not
// a GET. Third-party scripts (three.js for the 3D pages) are left to the
// browser's own cache; only Google Fonts are kept so offline pages look right.
//
// KILL SWITCH: if this ever serves something stale or broken, replace this
// whole file with
//     self.addEventListener("install", () => self.skipWaiting());
//     self.addEventListener("activate", () => self.registration.unregister());
// and push. Every phone drops the worker on its next visit.
//
// Bump VERSION when the list or the logic changes; old caches are deleted.

const VERSION = "v2";
const CACHE = `linkcs-${VERSION}`;
// Both spellings: the home page links to /pages/bus.html (Vercel redirects
// that to /pages/bus), while bookmarks and typed URLs use /bus.
const CORE = ["/", "/pages/bus", "/pages/mess", "/pages/week", "/pages/rooms",
              "/bus", "/mess", "/week", "/rooms"];
const TIMEOUT = 4000;

const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

// Every same-origin script and stylesheet a page loads.
function assetsOf(html) {
  const out = new Set();
  const re = /<(?:script|link)\b[^>]*?(?:src|href)=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const u = new URL(m[1], self.location.origin);
    if (u.origin === self.location.origin && /\.(js|css)$/.test(u.pathname)) out.add(u.pathname);
  }
  return [...out];
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const assets = new Set();
    for (const page of CORE) {
      try {
        const res = await fetch(page, { cache: "no-cache" });
        if (!res.ok) continue;
        await cache.put(page, res.clone());
        assetsOf(await res.text()).forEach((a) => assets.add(a));
      } catch { /* offline during install: the runtime cache fills in later */ }
    }
    await Promise.all([...assets].map(async (a) => {
      try {
        const res = await fetch(a, { cache: "no-cache" });
        if (res.ok) await cache.put(a, res);
      } catch { /* skip */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("linkcs-") && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function networkFirst(request, key) {
  const cache = await caches.open(CACHE);
  try {
    // Scripts and styles always ask the server whether they changed (a 304 when
    // they did not), so a browser's own heuristic cache can never hand back an
    // old script. A page navigation cannot be re-made with options (its
    // redirect mode must stay as it is), so it goes as it came.
    const res = await withTimeout(
      request.mode === "navigate" ? fetch(request) : fetch(request, { cache: "no-cache" }),
      TIMEOUT);
    if (res.ok && (res.type === "basic" || res.type === "cors")) cache.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(key, { ignoreSearch: true });
    if (hit) return hit;
    // A page this phone never opened, with no network: fall back to home,
    // which at least has the class card and the links.
    if (request.mode === "navigate") {
      const home = await cache.match("/");
      if (home) return home;
    }
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/api/")) return;
    // Pages are keyed by path without query string or .html, so
    // /pages/bus.html, /pages/bus and /pages/bus?notrack=1 are one entry.
    const key = req.mode === "navigate" ? url.pathname.replace(/\.html$/, "") : req;
    event.respondWith(networkFirst(req, key));
    return;
  }

  if (FONT_HOSTS.includes(url.hostname)) {
    // Font files never change at a given URL: cache first.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") cache.put(req, res.clone());
      return res;
    })());
  }
});

// ---------- notifications (api/push/*) ----------
self.addEventListener("push", (event) => {
  let msg = {};
  try { msg = event.data ? event.data.json() : {}; } catch { msg = { title: "linkCS", body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(msg.title || "linkCS", {
    body: msg.body || "",
    icon: "/assets/app/icon-192.png",
    badge: "/assets/app/icon-192.png",
    data: { url: msg.url || "/" },
    tag: msg.tag || undefined,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.location.origin)) { await w.focus(); return w.navigate ? w.navigate(url) : null; }
    }
    return self.clients.openWindow(url);
  })());
});
