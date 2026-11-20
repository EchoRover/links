// linkCS service worker: the app opens instantly and works offline.
//
// CACHE FIRST, VERSION CHECKED. A tap is answered straight from the copy on
// the phone, never waiting on the network. In the background the worker asks
// one question, GET /api/version ("which deploy is live?"). When that answer
// changes (every push is a new version), it downloads a fresh copy of every
// file it holds into a new cache, switches to it in one step, and tells open
// pages, which reload themselves (js/app.js). So a change reaches phones
// seconds after the app is opened, and nothing in between is ever half old,
// half new.
//
// The check runs on every page open (every tap that loads a page) and when
// the app comes back to the front; it never delays the tap itself. Pages the phone has never opened are fetched from
// the network the first time and kept from then on.
//
// Not cached: /api/* (live data, predictions, counts, notifications) and
// anything that is not a GET. Google Fonts are kept in their own cache.
//
// KILL SWITCH: if this ever serves something stale or broken, replace this
// whole file with
//     self.addEventListener("install", () => self.skipWaiting());
//     self.addEventListener("activate", () => self.registration.unregister());
// and push. Every phone drops the worker on its next visit.

const META = "linkcs-meta";            // one entry: which cache is live, and its version
const FONTS = "linkcs-fonts";
const CHECK_EVERY = 5 * 1000;        // only stops a burst of taps firing several checks
// Both spellings: the home page links to /pages/bus.html (Vercel redirects
// that to /pages/bus), while bookmarks and typed URLs use /bus.
const CORE = ["/", "/pages/bus", "/pages/mess", "/pages/week", "/pages/rooms",
              "/bus", "/mess", "/week", "/rooms"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

// Every same-origin script and stylesheet a page loads.
function assetsOf(html) {
  const out = new Set();
  const re = /<(?:script|link)\b[^>]*?(?:src|href)=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const u = new URL(m[1], self.location.origin);
    if (u.origin === self.location.origin && /\.(js|css|webmanifest)$/.test(u.pathname)) out.add(u.pathname);
  }
  return [...out];
}

// Pages are keyed by path without query string or .html, so /pages/bus.html,
// /pages/bus and /pages/bus?notrack=1 are one entry.
const pageKey = (url) => url.pathname.replace(/\.html$/, "");

async function readMeta() {
  const r = await (await caches.open(META)).match("/active");
  return r ? r.json() : null;                      // {cache, v}
}
async function writeMeta(meta) {
  await (await caches.open(META)).put("/active", new Response(JSON.stringify(meta)));
}
async function liveVersion() {
  const r = await fetch("/api/version", { cache: "no-store" });
  if (!r.ok) throw new Error("version " + r.status);
  return (await r.json()).v;
}

// Fill `name` with fresh copies of `urls` (pages plus the scripts/styles the
// core pages load). Core pages must all succeed or the build is abandoned;
// anything else that fails (e.g. a page that no longer exists) is dropped.
async function build(name, urls) {
  const cache = await caches.open(name);
  const assets = new Set();
  for (const u of urls) {
    try {
      const res = await fetch(u, { cache: "reload" });
      if (!res.ok || res.redirected) { if (CORE.includes(u)) throw new Error("core " + u); continue; }
      await cache.put(u, res.clone());
      if (!/\.(js|css|webmanifest|png|webp|json)$/.test(u)) assetsOf(await res.text()).forEach((a) => assets.add(a));
    } catch (e) {
      if (CORE.includes(u)) throw e;
    }
  }
  await Promise.all([...assets].filter((a) => !urls.includes(a)).map(async (a) => {
    try {
      const res = await fetch(a, { cache: "reload" });
      if (res.ok) await cache.put(a, res);
    } catch { /* skip */ }
  }));
  return cache;
}

async function dropOldCaches(keep) {
  for (const key of await caches.keys()) {
    if (key.startsWith("linkcs-") && key !== keep && key !== META && key !== FONTS) await caches.delete(key);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    let v = "boot";
    try { v = await liveVersion(); } catch { /* offline: version "boot", checked again later */ }
    const name = `linkcs-${v}`;
    try { await build(name, CORE); } catch { /* partial is fine on first install */ }
    await writeMeta({ cache: name, v });
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const meta = await readMeta();
    if (meta) await dropOldCaches(meta.cache);
    await self.clients.claim();
  })());
});

// ---------- the version check ----------
let lastCheck = 0;
let checking = null;
function checkForUpdate(force) {
  if (checking) return checking;
  if (!force && Date.now() - lastCheck < CHECK_EVERY) return Promise.resolve(false);
  lastCheck = Date.now();
  checking = (async () => {
    try {
      const meta = await readMeta();
      const v = await liveVersion();
      if (meta && meta.v === v) return false;
      const old = meta ? await caches.open(meta.cache) : null;
      const held = old ? (await old.keys()).map((r) => new URL(r.url).pathname) : [];
      const urls = [...new Set([...CORE, ...held.filter((u) => !/\.(js|css|webmanifest)$/.test(u))])];
      const name = `linkcs-${v}`;
      await build(name, urls);
      await writeMeta({ cache: name, v });
      await dropOldCaches(name);
      for (const c of await self.clients.matchAll({ type: "window" })) c.postMessage({ type: "linkcs-updated", v });
      return true;
    } catch {
      return false;                                   // offline or a failed build: keep serving the old copy
    } finally {
      checking = null;
    }
  })();
  return checking;
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "linkcs-check") event.waitUntil(checkForUpdate(false));
});

async function fromCacheFirst(event, req, key) {
  const meta = await readMeta();
  const cache = await caches.open(meta ? meta.cache : "linkcs-boot");
  const hit = await cache.match(key, { ignoreSearch: true });
  if (hit) {
    if (req.mode === "navigate") event.waitUntil(checkForUpdate(false));
    return hit;
  }
  try {
    const res = await fetch(req);
    if (res.ok && res.type === "basic" && !res.redirected) cache.put(key, res.clone());
    return res;
  } catch (err) {
    // A page this phone never opened, with no network: fall back to home.
    if (req.mode === "navigate") {
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
    const key = req.mode === "navigate" ? pageKey(url) : url.pathname;
    event.respondWith(fromCacheFirst(event, req, key));
    return;
  }

  if (FONT_HOSTS.includes(url.hostname)) {
    // Font files never change at a given URL: cache first.
    event.respondWith((async () => {
      const cache = await caches.open(FONTS);
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
