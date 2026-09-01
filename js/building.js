// ============================================================
// BUILDING VIEWER — one or several buildings, every floor.
//
// Each <code>-data.js pushes onto window.BUILDINGS, so a page shows
// whichever data files it loads: m3.html loads one, both.html loads
// two. Each building carries an `origin` in campus metres, so
// several land in their true relative positions for free.
//
// Every level gets a SOLID FLOOR PLATE cut from the CAD envelope,
// with the rooms sitting on top of it. Without the plate, any area
// the board segmentation did not resolve into a room reads as a
// hole in the building rather than as floor you simply have no
// detail for.
//
// Rooms and names come from the evacuation boards registered onto
// the CAD; the envelope and doors come from the CAD. Live occupancy
// comes through each room's timetable code, sharing timetable.js's
// calendar with the rooms page so the two cannot disagree.
// ============================================================

// Render on demand. The loop used to render and re-project all ~130 labels
// every frame forever, which pins a core for a scene that is static unless you
// touch it. Anything that changes the picture sets this and gets one frame.
// Declared first: several of the functions that set it run during setup.
let dirty = true;
const invalidate = () => { dirty = true; };

const BS = window.BUILDINGS || [];
const cvs = document.getElementById("scene");
const tagBox = document.getElementById("tags");

if (typeof THREE === "undefined" || !BS.length) {
    document.getElementById("b-side").innerHTML =
        '<p class="side-empty">three.js or the building data failed to load. Reload the page.</p>';
    throw new Error("missing three.js or BUILDINGS");
}

// timetable.js already defines a global KIND, so this one is RKIND.
const RKIND = {
    lecture:   { c: 0x6D28D9, label: "lecture hall" },
    classroom: { c: 0x1E40AF, label: "classroom" },
    lab:       { c: 0x0F766E, label: "lab" },
    office:    { c: 0xB45309, label: "office" },
    toilet:    { c: 0x64748B, label: "toilet" },
    amenity:   { c: 0xBE185D, label: "amenity" },
    service:   { c: 0x94A3B8, label: "service / unnamed" },
    stair:     { c: 0x15803D, label: "stair" },
};
const PLATE = 0xCFCBC3, GREY = 0xBDB9B1, FREE = 0x0F766E, BUSY = 0xD1495B;

// ---------- scene ----------

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 3000);

const EXT = (() => {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const b of BS) {
        x0 = Math.min(x0, b.origin[0]); x1 = Math.max(x1, b.origin[0] + b.w);
        z0 = Math.min(z0, b.origin[1]); z1 = Math.max(z1, b.origin[1] + b.d);
    }
    return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, span: Math.max(x1 - x0, z1 - z0) };
})();
const SPAN = EXT.span;

const sun = new THREE.DirectionalLight(0xffffff, 0.62);
sun.position.set(-SPAN * 0.6, SPAN * 1.2, SPAN * 0.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -SPAN, right: SPAN, top: SPAN, bottom: -SPAN, near: 1, far: SPAN * 5 });
scene.add(sun, new THREE.HemisphereLight(0xe6ecf5, 0x8f96a4, 0.55));

const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
scene.background = new THREE.Color(css("--bg") || "#F2EBDB");

// ---------- geometry ----------

const SLAB = 0.18, WALL_T = 0.22;
const FLOOR_H = BS[0].floorH, WALL_H = BS[0].wallH;
const levelGroups = new Map();
const picks = [];
const allTags = [];

function shapeOf(poly, ox, oz) {
    const s = new THREE.Shape();
    poly.forEach(([x, z], i) => {
        const X = x + ox - EXT.cx, Z = z + oz - EXT.cz;
        i ? s.lineTo(X, Z) : s.moveTo(X, Z);
    });
    s.closePath();
    return s;
}
function slabOf(poly, h, ox, oz) {
    const g = new THREE.ExtrudeGeometry(shapeOf(poly, ox, oz), { depth: h, bevelEnabled: false });
    g.rotateX(Math.PI / 2); g.translate(0, h, 0);
    return g;
}
// One box per edge: unlike extruding the polygon this leaves the room hollow, so
// you can still see into it from above.
function wallsOf(poly, h, ox, oz) {
    const parts = [];
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const dx = b[0] - a[0], dz = b[1] - a[1];
        const len = Math.hypot(dx, dz);
        if (len < 0.05) continue;
        const g = new THREE.BoxGeometry(len + WALL_T, h, WALL_T);
        g.rotateY(-Math.atan2(dz, dx));
        g.translate((a[0] + b[0]) / 2 + ox - EXT.cx, h / 2, (a[1] + b[1]) / 2 + oz - EXT.cz);
        parts.push(g);
    }
    return parts;
}
function groupFor(level) {
    if (!levelGroups.has(level)) {
        const g = new THREE.Group();
        g.userData.level = level;
        scene.add(g);
        levelGroups.set(level, g);
    }
    return levelGroups.get(level);
}

for (const b of BS) {
    const [ox, oz] = b.origin;
    for (const f of b.floors) {
        const g = groupFor(f.level);

        // the plate: the whole floor, so nothing ever reads as a hole
        const plate = new THREE.Mesh(slabOf(b.envelope, SLAB, ox, oz),
            new THREE.MeshLambertMaterial({ color: PLATE }));
        plate.receiveShadow = true;
        plate.userData = { room: { name: b.building + " floor", kind: "plate", area: null, i: -1 },
                           floor: f, b, plate: true };
        g.add(plate); picks.push(plate);

        for (const wg of wallsOf(b.envelope, WALL_H, ox, oz)) {
            const w = new THREE.Mesh(wg, new THREE.MeshLambertMaterial({
                color: 0x8A8578, transparent: true, opacity: 0.32, depthWrite: false }));
            w.castShadow = true; w.position.y = SLAB;
            g.add(w);
        }

        if (f.level === 0 && b.doors) {
            const dm = new THREE.MeshLambertMaterial({ color: 0xC2410C });
            for (const d of b.doors) {
                const dx = d.b[0] - d.a[0], dz = d.b[1] - d.a[1];
                const bg = new THREE.BoxGeometry(Math.hypot(dx, dz), 2.1, 0.30);
                bg.rotateY(-Math.atan2(dz, dx));
                bg.translate((d.a[0] + d.b[0]) / 2 + ox - EXT.cx, 2.1 / 2 + SLAB,
                             (d.a[1] + d.b[1]) / 2 + oz - EXT.cz);
                g.add(new THREE.Mesh(bg, dm));
            }
        }

        for (const r of f.rooms) {
            const mat = new THREE.MeshLambertMaterial({ color: GREY });
            const slab = new THREE.Mesh(slabOf(r.p, SLAB * 1.25, ox, oz), mat);
            slab.receiveShadow = true;
            slab.userData = { room: r, floor: f, b };
            g.add(slab); picks.push(slab);

            const wm = new THREE.MeshLambertMaterial({
                color: GREY, transparent: true, opacity: 0.32, depthWrite: false });
            slab.userData.wallMat = wm;
            for (const wg of wallsOf(r.p, WALL_H, ox, oz)) {
                const w = new THREE.Mesh(wg, wm);
                w.castShadow = true; w.position.y = SLAB;
                g.add(w);
            }

            let sx = 0, sz = 0;
            for (const [x, z] of r.p) { sx += x; sz += z; }
            const el = document.createElement("div");
            el.className = "tag";
            el.addEventListener("click", ev => { ev.stopPropagation(); select(slab); });
            tagBox.appendChild(el);
            allTags.push({ el, r, f, b, mesh: slab,
                           p: [sx / r.p.length + ox - EXT.cx, sz / r.p.length + oz - EXT.cz] });
        }
    }
}

// ---------- occupancy ----------

const SLOTS = (() => {
    const m = new Map();
    for (const [day, s, e, code, room] of OCC) {
        const k = [day, s, e, code, room].join("|");
        if (!m.has(k)) m.set(k, { day, room, code, s, e, from: tmin(s), to: tmin(e) });
    }
    return [...m.values()].sort((a, b) => a.from - b.from);
})();
function today() {
    const n = new Date();
    if (n.getDay() < 1 || n.getDay() > 5 || NO_CLASS[ymd(n)]) return null;
    return { day: n.getDay(), mins: n.getHours() * 60 + n.getMinutes() };
}
function liveState(code) {
    const t = today();
    if (!t || !code) return null;
    return SLOTS.find(s => s.room === code && s.day === t.day && t.mins >= s.from && t.mins < s.to) || null;
}
// null = not a timetabled room · true = free right now · false = in use
const freeNow = r => r.code ? !liveState(r.code) : null;

// ---------- colour ----------

let mode = "free";        // "free" = grey building, availability lit · "type" = by room type

function paint() {
    dirty = true;
    for (const m of picks) {
        if (m.userData.plate) continue;
        const r = m.userData.room;
        let c;
        if (mode === "type") {
            c = RKIND[r.kind] ? RKIND[r.kind].c : GREY;
        } else {
            const f = freeNow(r);
            c = f === null ? GREY : (f ? FREE : BUSY);
        }
        m.material.color.setHex(c);
        if (m.userData.wallMat) m.userData.wallMat.color.setHex(c);
    }
    const leg = document.getElementById("b-legend");
    leg.innerHTML = mode === "type"
        ? Object.entries(RKIND).map(([, v]) =>
            `<span><i style="background:#${v.c.toString(16).padStart(6, "0")}"></i>${v.label}</span>`).join("")
        : [[FREE, "free right now"], [BUSY, "in use"], [GREY, "not timetabled"]].map(([c, l]) =>
            `<span><i style="background:#${c.toString(16).padStart(6, "0")}"></i>${l}</span>`).join("");
}

// ---------- labels ----------

const _v = new THREE.Vector3();
function drawTags() {
    const w = cvs.clientWidth, h = cvs.clientHeight;
    const placed = [];
    // in "free" mode the timetabled rooms are the point, so they get first claim
    const rank = t => (freeNow(t.r) !== null && mode === "free" ? 2 : 0) + (t.r.name ? 1 : 0);
    for (const t of allTags.slice().sort((a, b) => rank(b) - rank(a))) {
        if (!labelsOn || !shown.has(t.f.level) || (!t.r.name && !showAnon)) { t.el.style.display = "none"; continue; }
        _v.set(t.p[0], t.f.level * (FLOOR_H + explode) + WALL_H + 0.6, t.p[1]).project(camera);
        const x = (_v.x * 0.5 + 0.5) * w, y = (-_v.y * 0.5 + 0.5) * h;
        if (_v.z > 1 || x < -40 || y < -20 || x > w + 40 || y > h + 20) { t.el.style.display = "none"; continue; }
        if (placed.some(p => Math.abs(p[0] - x) < 84 && Math.abs(p[1] - y) < 17) && sel !== t.mesh) {
            t.el.style.display = "none"; continue;
        }
        placed.push([x, y]);
        const f = freeNow(t.r);
        t.el.style.display = "";
        t.el.style.left = x + "px"; t.el.style.top = y + "px";
        t.el.textContent = t.r.name || "#" + t.r.i;
        t.el.className = "tag" + (sel === t.mesh ? " sel" : "")
                       + (f === false ? " busy" : "") + (f === true ? " free" : "")
                       + (t.r.name ? "" : " anon");
    }
}

// ---------- camera ----------

const target = new THREE.Vector3(0, FLOOR_H * 0.5, 0);
const HOME = () => ({ r: SPAN * 1.5, theta: -0.95, phi: 0.85 });
let orbit = HOME();
function place() {
    dirty = true;
    camera.position.set(
        target.x + orbit.r * Math.sin(orbit.phi) * Math.cos(orbit.theta),
        target.y + orbit.r * Math.cos(orbit.phi),
        target.z + orbit.r * Math.sin(orbit.phi) * Math.sin(orbit.theta));
    camera.lookAt(target);
}
function resize() {
    dirty = true;
    const w = cvs.clientWidth, h = cvs.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
}

let drag = null;
cvs.addEventListener("pointerdown", ev => {
    drag = { x: ev.clientX, y: ev.clientY, b: ev.button, moved: false, id: ev.pointerId,
             t: target.clone(), th: orbit.theta, ph: orbit.phi };
});
cvs.addEventListener("pointermove", ev => {
    if (!drag) return;
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 3) {
        drag.moved = true; cvs.setPointerCapture(drag.id); cvs.classList.add("dragging");
    }
    if (!drag.moved) return;
    if (drag.b === 2 || ev.shiftKey) {
        const k = orbit.r * 0.0014;
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
        const fwd = right.clone().cross(camera.up).normalize();
        target.copy(drag.t).addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k);
    } else {
        orbit.theta = drag.th + dx * 0.005;
        orbit.phi = Math.max(0.05, Math.min(1.5, drag.ph - dy * 0.005));
    }
    place();
});
cvs.addEventListener("pointerup", ev => {
    if (drag && !drag.moved && ev.button === 0) pick(ev);
    if (drag && drag.moved) cvs.releasePointerCapture(drag.id);
    drag = null; cvs.classList.remove("dragging");
});
cvs.addEventListener("contextmenu", ev => ev.preventDefault());
cvs.addEventListener("wheel", ev => {
    ev.preventDefault();
    orbit.r = Math.max(5, Math.min(SPAN * 5, orbit.r * Math.exp(ev.deltaY * 0.0012)));
    place();
}, { passive: false });
addEventListener("resize", resize);

// ---------- picking + panel ----------

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let sel = null;
function pick(ev) {
    const r = cvs.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    // rooms before plates, so clicking a room never selects the slab under it
    const hits = ray.intersectObjects(picks.filter(m => shown.has(m.userData.floor.level)), false);
    const room = hits.find(h => !h.object.userData.plate);
    select(room ? room.object : (hits[0] ? hits[0].object : null));
}
function select(mesh) {
    dirty = true;
    sel = mesh;
    for (const m of picks) m.material.emissive = new THREE.Color(m === mesh ? 0x333333 : 0x000000);
    renderSide();
}

function renderSide() {
    const side = document.getElementById("b-side");
    if (!sel) { side.innerHTML = `<p class="side-empty">Click a room.</p>`; return; }
    const { room: r, floor, b } = sel.userData;
    let h = `<div class="side-head"><h3 class="side-name">${r.name || "Unnamed space"}</h3>` +
            `<span class="side-code">${r.code ? r.code + " · " : ""}${b.building} · level ${floor.level}</span></div>`;

    if (r.code) {
        const t = today();
        const day = t ? SLOTS.filter(s => s.room === r.code && s.day === t.day) : [];
        const on = t ? day.find(s => t.mins >= s.from && t.mins < s.to) : null;
        h += `<div class="side-status">`;
        if (on) h += `<span class="st-busy-course">${on.code}</span> ${COURSE_TITLES[on.code] || ""}
                      <span class="st-when">until <b>${t12(on.e)}</b></span>`;
        else if (t) {
            const nx = day.find(s => t.mins < s.from);
            h += `<span class="st-free">free now</span>` +
                 (nx ? `<span class="st-when">next: ${nx.code} at <b>${t12(nx.s)}</b></span>`
                     : `<span class="st-when">nothing else today</span>`);
        } else h += `<span class="st-free">no classes today</span>`;
        h += `</div>`;
        h += `<div class="slots">` + day.map(s => `<div class="slot-row${t && t.mins >= s.to ? " past" : ""}">
              <span class="slot-time">${t12(s.s)}–${t12(s.e)}</span>
              <span><span class="slot-course">${s.code}</span> ${COURSE_TITLES[s.code] || ""}</span></div>`).join("")
             + `</div>` || `<div class="slot-row">nothing scheduled today</div>`;
    } else if (!sel.userData.plate) {
        h += `<p class="side-empty" style="margin-top:10px">Not a timetabled room.</p>`;
    }
    h += `<div class="side-meta">` + (r.area ? `${r.area} m² · ` : "") +
         `${(RKIND[r.kind] || { label: "floor plate" }).label}<br>` +
         (r.i >= 0 ? `board room #${r.i}` : `from the CAD envelope`) +
         `<br>board fit IoU ${floor.iou}</div>`;
    side.innerHTML = h;
}

// ---------- toolbar ----------

const LEVELS = [...new Set(BS.flatMap(b => b.floors.map(f => f.level)))].sort();
let shown = new Set(LEVELS);
let explode = 7, labelsOn = true, showAnon = false;

function buildFloorBar() {
    const bar = document.getElementById("b-floors");
    bar.innerHTML = "";
    for (const lvl of LEVELS) {
        const b = document.createElement("button");
        b.textContent = lvl === 0 ? "Ground" : "Level " + lvl;
        b.className = shown.has(lvl) ? "on" : "";
        b.addEventListener("click", () => {
            shown.has(lvl) ? shown.delete(lvl) : shown.add(lvl);
            if (!shown.size) shown.add(lvl);
            applyFloors(); buildFloorBar();
        });
        bar.appendChild(b);
    }
}
const applyFloors = () => { for (const [lvl, g] of levelGroups) g.visible = shown.has(lvl); dirty = true; };
const applyExplode = () => { for (const [lvl, g] of levelGroups) g.position.y = lvl * (FLOOR_H + explode); dirty = true; };

document.getElementById("b-explode").addEventListener("input", e => {
    explode = +e.target.value; applyExplode();
});
for (const btn of document.querySelectorAll("#b-modes button")) {
    btn.addEventListener("click", () => {
        mode = btn.dataset.mode;
        for (const o of document.querySelectorAll("#b-modes button")) o.classList.toggle("on", o === btn);
        paint();
    });
}
document.getElementById("b-labels").addEventListener("click", ev => {
    if (labelsOn && !showAnon) { showAnon = true; ev.target.textContent = "labels: all"; }
    else if (labelsOn && showAnon) { labelsOn = false; showAnon = false; ev.target.textContent = "labels: off"; ev.target.classList.remove("on"); }
    else { labelsOn = true; ev.target.textContent = "labels"; ev.target.classList.add("on"); }
    dirty = true;
});
document.getElementById("b-reset").addEventListener("click", () => {
    orbit = HOME(); target.set(0, FLOOR_H * 0.5, 0); place();
});
document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", cur);
    try { localStorage.setItem("theme", cur); } catch (e) { }
    setTimeout(() => scene.background = new THREE.Color(css("--bg")), 30);
});

// ---------- where am I ----------
//
// The browser gives latitude and longitude; the model is in metres on the
// CAD's own arbitrary grid. Nothing connects the two until someone stands in a
// known room and says so, so the transform is CALIBRATED, not assumed: two
// readings taken in two different rooms give scale, rotation and offset.
//
// Be clear about the ceiling. A laptop has no GPS -- it positions off WiFi, and
// on a campus that is tens of metres of error. This can tell you which building
// and roughly which end of it. It cannot tell you which room, and the marker
// draws its accuracy circle so that is visible rather than implied.

const CAL_KEY = "linkcs.geo.calib";

// A georeference is a property of the BUILDING, not of whoever is holding the
// laptop, so it ships in the data. GEO_FIX below is the baked-in calibration:
// once it is filled in, nobody ever calibrates again. Until then anyone can
// calibrate locally and press "copy calibration" to hand over the two readings.
// Measured on Evan's phone, 2026-08-31. Baseline only 43 m and mostly east-west,
// so a 6 m phone fix is +/-8 deg of rotation and +/-14% of scale here. Good
// enough for which building; a longer walk would tighten it a lot.
const GEO_FIX = [
    { lat: 24.394675, lon: 54.586659, x: -9.4, z: -23.4, room: "Workshop / Makerspace Lab" },
    { lat: 24.394711, lon: 54.587077, x: 22.2, z: 23.3, room: "Classroom" },
];

let CAL = GEO_FIX ? GEO_FIX.slice() : [];
if (!CAL.length) {
    try { CAL = JSON.parse(localStorage.getItem(CAL_KEY) || "[]"); } catch (e) { CAL = []; }
}

// metres per degree at this latitude, so lat/lon differences become a local grid
function llToLocal(lat, lon, lat0) {
    const mLat = 111320, mLon = 111320 * Math.cos(lat0 * Math.PI / 180);
    return [lon * mLon, lat * mLat];
}
// similarity fit from two point pairs: rotation + uniform scale + translation
function fitGeo(cal) {
    if (cal.length < 2) return null;
    const [a, b] = cal;
    const pa = llToLocal(a.lat, a.lon, a.lat), pb = llToLocal(b.lat, b.lon, a.lat);
    const gx = pb[0] - pa[0], gy = pb[1] - pa[1];
    const mx = b.x - a.x, my = b.z - a.z;
    const gl = Math.hypot(gx, gy), ml = Math.hypot(mx, my);
    if (gl < 5 || ml < 5) return null;          // the two points must be far enough apart
    const k = ml / gl;
    const th = Math.atan2(my, mx) - Math.atan2(gy, gx);
    return { lat0: a.lat, k, th, ax: pa[0], ay: pa[1], mx0: a.x, mz0: a.z, sep: ml };
}
function geoToModel(lat, lon, g) {
    const p = llToLocal(lat, lon, g.lat0);
    const dx = (p[0] - g.ax) * g.k, dy = (p[1] - g.ay) * g.k;
    return [g.mx0 + dx * Math.cos(g.th) - dy * Math.sin(g.th),
            g.mz0 + dx * Math.sin(g.th) + dy * Math.cos(g.th)];
}

let marker = null, ring = null;
function showMe(x, z, acc) {
    if (!marker) {
        marker = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 12),
            new THREE.MeshLambertMaterial({ color: 0xD1495B }));
        marker.rotation.x = Math.PI;
        ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.06, 48),
            new THREE.MeshBasicMaterial({ color: 0xD1495B, transparent: true, opacity: 0.55,
                                          side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        scene.add(marker, ring);
    }
    marker.position.set(x, WALL_H + 3.4, z);
    ring.position.set(x, 0.05, z);
    ring.scale.setScalar(Math.max(acc, 3));
    marker.visible = ring.visible = true;
}

// Put the answer where the eye already is -- the side panel -- not in a thin
// grey line under the canvas, which is where it was and which is why pressing
// "locate me" looked like it did nothing at all.
function geoStatus(msg, kind) {
    const line = document.getElementById("b-geo-msg");
    if (line) line.textContent = msg;
    const side = document.getElementById("b-side");
    if (!side) return;
    const old = side.querySelector(".geo-box");
    if (old) old.remove();
    const d = document.createElement("div");
    d.className = "geo-box " + (kind || "");
    d.innerHTML = `<h4>where am I</h4>${msg}`;
    side.prepend(d);
}

// Why a fix might not be possible at all, in plain terms.
async function geoDiagnose() {
    const bits = [];
    if (!window.isSecureContext) bits.push("this page is not a secure context, so the browser will refuse to give a position — open it over https or via localhost / 127.0.0.1");
    if (!navigator.geolocation) bits.push("this browser exposes no geolocation API");
    try {
        if (navigator.permissions) {
            const st = await navigator.permissions.query({ name: "geolocation" });
            if (st.state === "denied") bits.push("location permission is denied for this site — allow it in the padlock menu, and check the browser is allowed Location Services in macOS System Settings > Privacy & Security");
        }
    } catch (e) { /* Safari has no permissions query for geolocation */ }
    return bits;
}

// Which rooms is that fix actually consistent with? A single dot implies a
// precision the hardware does not have; the honest answer is a shortlist.
function roomsNear(x, z, radius) {
    const out = [];
    for (const t of allTags) {
        if (!shown.has(t.f.level)) continue;
        const d = Math.hypot(t.p[0] - x, t.p[1] - z);
        if (d <= radius) out.push({ name: t.r.name || "#" + t.r.i, b: t.b.building,
                                    lvl: t.f.level, d, mesh: t.mesh });
    }
    return out.sort((a, b) => a.d - b.d).slice(0, 4);
}

// Average several fixes rather than trusting one. WiFi positioning jitters by
// metres between consecutive readings, and the mean of a handful is materially
// steadier than any single one.
function averageFix(n, ms, onDone, onFail) {
    const got = [];
    let done = false;
    const finish = () => {
        if (done) return; done = true;
        if (!got.length) return onFail("no fix");
        const m = k => got.reduce((a, g) => a + g[k], 0) / got.length;
        onDone(m("lat"), m("lon"), m("acc"), got.length);
    };
    const id = navigator.geolocation.watchPosition(p => {
        got.push({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy });
        geoStatus(`sampling… ${got.length} of ${n}`);
        if (got.length >= n) { navigator.geolocation.clearWatch(id); finish(); }
    }, e => { navigator.geolocation.clearWatch(id); if (!got.length) onFail(e.message); else finish(); },
       { enableHighAccuracy: true, maximumAge: 0, timeout: ms });
    setTimeout(() => { navigator.geolocation.clearWatch(id); finish(); }, ms);
}

document.getElementById("b-locate").addEventListener("click", async () => {
    const bad = await geoDiagnose();
    if (bad.length) return geoStatus(bad.join("<br><br>"), "warn");
    const g = fitGeo(CAL);
    if (!g) {
        geoStatus(`<b>The map is not calibrated</b>, so there is nothing to place a position on.` +
                  `<br><br>Click the room you are standing in, press <b>I am here</b>, walk somewhere ` +
                  `far, and repeat. ${CAL.length} of 2 points recorded.`, "warn");
        return;
    }
    geoStatus("sampling…");
    averageFix(5, 8000, (lat, lon, acc, n) => {
        const [x, z] = geoToModel(lat, lon, g);
        showMe(x, z, acc);
        dirty = true;
        const near = roomsNear(x, z, Math.max(acc, 12) + 8);
        const list = near.length
            ? near.map(r => `<b>${r.name}</b> <span style="opacity:.65">${r.b} L${r.lvl} · ${r.d.toFixed(0)} m</span>`).join(" · ")
            : "nothing close enough to name";
        geoStatus(`<b>Nearest rooms:</b> ${list}<br><br>` +
                  `Averaged ${n} fixes, ±${Math.round(acc)} m. On a laptop that is WiFi positioning, ` +
                  `not GPS — expect the right building and roughly the right end of it, not the right ` +
                  `room. A phone does much better.`, "ok");
    }, msg => geoStatus(`The browser refused: <b>${msg}</b>.<br><br>On a Mac that is usually Location ` +
                        `Services being off for this browser, or the site permission being blocked ` +
                        `in the padlock menu.`, "warn"));
});

document.getElementById("b-here").addEventListener("click", async () => {
    if (!sel || sel.userData.plate) return geoStatus("Click the room you are standing in first, then press this.", "warn");
    const bad = await geoDiagnose();
    if (bad.length) return geoStatus(bad.join("<br><br>"), "warn");
    geoStatus("taking a reading…");
    navigator.geolocation.getCurrentPosition(pos => {
        const r = sel.userData.room, b = sel.userData.b;
        let sx = 0, sz = 0;
        for (const [x, z] of r.p) { sx += x; sz += z; }
        const x = sx / r.p.length + b.origin[0] - EXT.cx;
        const z = sz / r.p.length + b.origin[1] - EXT.cz;
        CAL.push({ lat: pos.coords.latitude, lon: pos.coords.longitude, x, z,
                   room: r.name || "#" + r.i });
        CAL = CAL.slice(-2);
        try { localStorage.setItem(CAL_KEY, JSON.stringify(CAL)); } catch (e) { }
        const g = fitGeo(CAL);
        geoStatus(CAL.length < 2
            ? `Point 1 recorded in <b>${CAL[0].room}</b>.<br><br>Now walk to a room far away and do it again.`
            : g ? `<b>Calibrated</b> from ${CAL[0].room} and ${CAL[1].room}, ${g.sep.toFixed(0)} m apart.<br>` +
                  `Press <b>locate me</b>.<br><br>` +
                  `Stored in this browser only. To make it permanent for everyone, send these ` +
                  `two lines (screenshot is fine) or <a href="#" id="geo-copy">copy them</a>:` +
                  `<pre class="geo-fix">${CAL.map(c =>
                      `${c.lat.toFixed(6)}, ${c.lon.toFixed(6)}  ${c.x.toFixed(1)} ${c.z.toFixed(1)}  ${c.room}`
                   ).join("\n")}</pre>`
                : `Those two points are too close together to work out a rotation. Try rooms further apart.`,
            g ? "ok" : "warn");
        const cp = document.getElementById("geo-copy");
        if (cp) cp.addEventListener("click", e => {
            e.preventDefault();
            const txt = "const GEO_FIX = " + JSON.stringify(CAL.map(c => ({
                lat: c.lat, lon: c.lon, x: +c.x.toFixed(2), z: +c.z.toFixed(2), room: c.room })), null, 2) + ";";
            navigator.clipboard.writeText(txt).then(() => { cp.textContent = "copied"; },
                                                    () => { console.log(txt); cp.textContent = "see console"; });
        });
    }, err => geoStatus("location refused or unavailable: " + err.message), { enableHighAccuracy: true });
});

// ---------- go ----------

const NAMES = BS.map(b => b.building).join(" + ");
const H1 = document.querySelector(".b-title");
if (H1) H1.innerHTML = BS.length > 1 ? `${NAMES}, <em>every floor</em>`
                                     : `${NAMES}, <em>${LEVELS.length > 1 ? "both floors" : "level " + LEVELS[0]}</em>`;
document.title = `${NAMES} in 3D · linkCS`;
const META = document.querySelector(".brand-meta");
if (META) META.textContent = `${NAMES.toLowerCase()} · 3d`;

buildFloorBar(); applyFloors(); applyExplode(); paint(); resize(); place();
new ResizeObserver(resize).observe(cvs);
addEventListener("focus", invalidate);

function tick() {
    const n = new Date();
    document.getElementById("b-clock").textContent =
        String(n.getHours()).padStart(2, "0") + ":" + String(n.getMinutes()).padStart(2, "0");
    paint();
}
tick(); setInterval(tick, 30000);

(function loop() {
    requestAnimationFrame(loop);
    if (!dirty) return;
    dirty = false;
    renderer.render(scene, camera);
    drawTags();
})();
