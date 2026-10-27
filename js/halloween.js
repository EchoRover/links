// ============================================================
// halloween.js: the playable half of Halloween week.
//
// Does nothing unless halloween-init.js put html.halloween on the page.
// Everything here is added on top of the page and never moves, hides or
// covers an existing link:
//   - a ghost hunt: one ghost on each of 5 pages, tap to catch it; a
//     pumpkin counter (bottom left) keeps score across the site
//   - catching all 5: candy burst, a "Ghostbuster 2026" badge on the
//     home page, and the header jack-o'-lantern stays lit for good
//   - the jack-o'-lantern in the header: tap to light it
//   - trick or treat: long-press the logo (or tap the wordmark on home)
//   - a few bats drifting behind the home page, pausable
// Scores live in localStorage (per viewer); every access is guarded,
// because a private window can throw on it. Reduced-motion users get
// the same game with the animation left out.
// ============================================================

(function () {
    const root = document.documentElement;
    if (!root.classList.contains('halloween')) return;

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const store = {
        get(key, fallback) {
            try {
                const v = localStorage.getItem(key);
                return v === null ? fallback : JSON.parse(v);
            } catch (e) { return fallback; }
        },
        set(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
        }
    };

    // One ghost per page, each with its own hiding place and pose, picked
    // from that page's layout. `anchor` is a non-link element the ghost is
    // pinned to (absolutely, from its edge), and the CSS for each pose
    // keeps it in empty space: above, below or beside the anchor, never on
    // a link. The page key is the last path segment, which is the same
    // locally (/pages/bus.html) and on Vercel (/bus, cleanUrls).
    //   peek  behind the top edge of the class card, rises when you look
    //   hang  upside down under the last live bus card, swinging
    //   sink  half sunk into the floor at the end of the menu, bobbing
    //   drift floating beside the course legend under the timetable
    //   sit   sitting at the end of the rooms footnote, blinking
    const GHOSTS = [
        { id: 'index', label: 'Home',       href: '/',                 anchor: '#tt-card',            pose: 'peek' },
        { id: 'bus',   label: 'Bus',        href: '/pages/bus.html',   anchor: '#next-wrap',          pose: 'hang' },
        { id: 'mess',  label: 'Mess',       href: '/pages/mess.html',  anchor: '#mess-body',          pose: 'sink' },
        { id: 'week',  label: 'Timetable',  href: '/pages/week.html',  anchor: '#wk-legend',          pose: 'drift' },
        { id: 'rooms', label: 'Free Rooms', href: '/pages/rooms.html', anchor: '.rooms-foot',         pose: 'sit' }
    ];
    const page = location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
    const isHome = page === 'index';

    let caught = store.get('hw-caught', []).filter((id) => GHOSTS.some((g) => g.id === id));
    const won = () => caught.length === GHOSTS.length;

    // Griffy is only for the few hand-lettered bits (badge, toast, panel
    // title), so it can arrive late without shifting anything that matters.
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Griffy&display=swap';
    document.head.appendChild(font);

    // ---------- artwork (inline SVG, a few hundred bytes each) ----------
    const PUMPKIN =
        '<svg viewBox="0 0 40 40" aria-hidden="true">' +
        '<path class="hw-stem" d="M19 9c0-3 1-5 4-6l1 2c-2 1-2 2-2 4z"/>' +
        '<ellipse class="hw-skin" cx="20" cy="23" rx="17" ry="13"/>' +
        '<path class="hw-rib" d="M20 10c-5 4-5 22 0 26M20 10c5 4 5 22 0 26M11 12c-5 5-5 17 0 22M29 12c5 5 5 17 0 22"/>' +
        '<g class="hw-face"><path d="M11 21l4-5 3 5z"/><path d="M22 21l3-5 4 5z"/>' +
        '<path d="M10 26c3 4 17 4 20 0l-3 1-2 2-2-2-3 2-3-2-2 2-2-2z"/></g></svg>';
    const GHOST =
        '<svg viewBox="0 0 32 36" aria-hidden="true">' +
        '<path class="hw-sheet" d="M16 2C8 2 4 8 4 15v18l4-3 4 3 4-3 4 3 4-3 4 3V15c0-7-4-13-12-13z"/>' +
        '<ellipse class="hw-eye" cx="12" cy="15" rx="2" ry="3"/><ellipse class="hw-eye" cx="20" cy="15" rx="2" ry="3"/>' +
        '<ellipse class="hw-eye" cx="16" cy="22" rx="2" ry="1.4"/></svg>';
    // A bat: one wing drawn once and mirrored, so both flap from the
    // shoulder (46,20) by rotation. Leading edge with a wrist hump, a
    // scalloped trailing edge between the finger tips, pointed ears.
    const WING = 'M46 19C40 10 33 5 27 6 19 7 9 10 1 16c4 .5 7 2.5 8 6 3-2.5 7-2.5 10 .5 3-3 8-2.5 11 1 3-2.5 8-2 11 1.5 2-1.5 4-2.5 5-3z';
    const BAT =
        '<svg viewBox="0 0 100 46" aria-hidden="true">' +
        '<path class="hw-wing" d="' + WING + '"/>' +
        '<g transform="matrix(-1 0 0 1 100 0)"><path class="hw-wing" d="' + WING + '"/></g>' +
        '<path d="M45.5 13.5 44.6 5.2l3.9 5.3h3l3.9-5.3-.9 8.3c1.3 1.6 1.8 3.4 1.6 5.3l-.4 9.5c-.4 5-3.2 8-5.7 8s-5.3-3-5.7-8l-.4-9.5c-.2-1.9.3-3.7 1.6-5.3z"/>' +
        '</svg>';

    // ---------- toast: one line at a time, read out politely ----------
    const toast = document.createElement('div');
    toast.className = 'hw-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    let toastTimer;
    function say(title, line, big) {
        toast.classList.toggle('big', !!big);
        toast.innerHTML = '<b></b><span></span>';
        toast.querySelector('b').textContent = title;
        toast.querySelector('span').textContent = line || '';
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
    }

    // ---------- candy burst: plain spans flung out with CSS ----------
    const CANDY = ['corn', 'ball-o', 'ball-p', 'ball-g', 'wrap'];
    function burst(x, y, n) {
        if (reduce) return;
        const layer = document.createElement('div');
        layer.className = 'hw-burst';
        layer.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < n; i++) {
            const c = document.createElement('i');
            c.className = 'hw-c-' + CANDY[i % CANDY.length];
            const a = Math.random() * Math.PI * 2;
            const d = 60 + Math.random() * (n > 30 ? 260 : 120);
            c.style.left = x + 'px';
            c.style.top = y + 'px';
            c.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px');
            c.style.setProperty('--dy', (Math.sin(a) * d - 40).toFixed(0) + 'px');
            c.style.setProperty('--r', (Math.random() * 720 - 360).toFixed(0) + 'deg');
            c.style.animationDelay = (Math.random() * 0.12).toFixed(2) + 's';
            layer.appendChild(c);
        }
        document.body.appendChild(layer);
        setTimeout(() => layer.remove(), 1800);
    }

    // a single bat crossing the screen once (the "trick")
    function flyBat() {
        if (reduce) return;
        const b = document.createElement('div');
        b.className = 'hw-flyby';
        b.setAttribute('aria-hidden', 'true');
        b.innerHTML = '<span class="hw-bob">' + BAT + '</span>';
        document.body.appendChild(b);
        setTimeout(() => b.remove(), 2800);
    }

    // ---------- header: moon + skyline + jack-o'-lantern ----------
    const topbar = document.querySelector('.topbar');
    let lantern = null;
    if (topbar) {
        const sky = document.createElement('div');
        sky.className = 'hw-sky';
        sky.setAttribute('aria-hidden', 'true');
        // One small scene on the right of the bar: a hill, a crooked house
        // with a tower and a leaning chimney, two bare trees, a broken
        // fence, two lit windows. It fades out to the left so it never
        // runs under the wordmark; the moon hangs above it.
        sky.innerHTML =
            '<span class="hw-moon"></span>' +
            '<svg class="hw-scene" viewBox="0 0 320 64" preserveAspectRatio="xMaxYMax meet">' +
            '<path d="M0 64C50 58 100 46 160 42c50-3 110 2 160 12v10z"/>' +
            '<path d="M168 44V17l-4 0 8-13 8 13h-4v6l4-2 21-15 22 16-4 0v22z"/>' +
            '<path d="M209 14l6-2 3 11h-6z"/>' +
            '<path class="hw-tree" d="M114 49c1-9 0-17-3-25m3 11c4-3 6-7 6-12m-5 1c-3-3-7-4-10-3m7 8c-4 0-7 2-9 5m10-15c1-4 0-7-2-9M272 51c0-7-1-12-3-17m2 6c3-2 5-5 5-9m-6 1c-2-2-5-3-7-2"/>' +
            '<path class="hw-tree" d="M232 46v-9m6 10v-8m6 8.5-1-8m7 9 3-7.5M229 41h19"/>' +
            '<rect class="hw-win" x="184" y="27" width="5" height="6"/><rect class="hw-win" x="201" y="31" width="5" height="5"/>' +
            '</svg>';
        topbar.prepend(sky);

        // The 3D pages already fill their top bar with view buttons on a
        // phone, so the lantern stays home there rather than crowd them.
        const utils = topbar.querySelector('.topbar-utils');
        if (utils && !['both', 'm3', 'm4', 'campus'].includes(page)) {
            lantern = document.createElement('button');
            lantern.type = 'button';
            lantern.className = 'button hw-lantern';
            lantern.innerHTML = PUMPKIN;
            utils.insertBefore(lantern, utils.querySelector('#theme-toggle'));
            lantern.addEventListener('click', () => {
                if (won()) {
                    const r = lantern.getBoundingClientRect();
                    burst(r.left + r.width / 2, r.top + r.height / 2, 14);
                    say('Still lit.', 'Ghostbusters do not do power cuts.');
                    return;
                }
                const lit = !lantern.classList.contains('lit');
                store.set('hw-lit', lit);
                paintLantern();
            });
        }
    }
    function paintLantern() {
        if (!lantern) return;
        const lit = won() || store.get('hw-lit', false);
        lantern.classList.toggle('lit', lit);
        lantern.classList.toggle('won', won());
        lantern.setAttribute('aria-pressed', String(lit));
        lantern.setAttribute('aria-label', won() ? 'Jack-o\'-lantern, lit for good' : (lit ? 'Blow out the jack-o\'-lantern' : 'Light the jack-o\'-lantern'));
    }
    paintLantern();

    // ---------- the pumpkin counter + its panel ----------
    const counter = document.createElement('button');
    counter.type = 'button';
    counter.className = 'hw-counter';
    counter.setAttribute('aria-expanded', 'false');
    counter.setAttribute('aria-controls', 'hw-panel');
    document.body.appendChild(counter);

    const panel = document.createElement('div');
    panel.className = 'hw-panel';
    panel.id = 'hw-panel';
    panel.hidden = true;
    document.body.appendChild(panel);

    function paintCounter() {
        counter.innerHTML = PUMPKIN + '<span class="hw-count">' + caught.length + '/' + GHOSTS.length + '</span>';
        counter.setAttribute('aria-label', 'Ghost hunt: ' + caught.length + ' of ' + GHOSTS.length + ' caught');
        counter.classList.toggle('won', won());
    }

    function paintPanel() {
        const rows = GHOSTS.map((g) => {
            const got = caught.includes(g.id);
            const here = g.id === page;
            return '<li class="' + (got ? 'got' : '') + '">' +
                '<span class="hw-dot" aria-hidden="true"></span>' +
                (here ? '<span>' + g.label + ' <em>(this page)</em></span>' : '<a href="' + g.href + '">' + g.label + '</a>') +
                '<span class="hw-state">' + (got ? 'caught' : 'still out there') + '</span></li>';
        }).join('');
        panel.innerHTML =
            '<p class="hw-panel-title">' + (won() ? 'Ghostbuster 2026' : 'Ghost hunt') + '</p>' +
            '<p class="hw-panel-sub">' + (won()
                ? 'All five caught. The lantern in the header stays lit.'
                : 'One ghost hides on each of these pages. Tap it to catch it.') + '</p>' +
            '<ul class="hw-list">' + rows + '</ul>' +
            '<div class="hw-panel-foot">' +
            (!reduce ? '<button type="button" class="hw-mini" data-act="boo"></button>' : '') +
            (!reduce ? '<button type="button" class="hw-mini" data-act="scare"></button>' : '') +
            (isHome && !reduce ? '<button type="button" class="hw-mini" data-act="bats"></button>' : '') +
            '<button type="button" class="hw-mini" data-act="close">close</button></div>';
        paintBatsButton();
        const boo = panel.querySelector('[data-act="boo"]');
        if (boo) boo.textContent = booOn() ? 'ghosts: on' : 'ghosts: off';
        const sc = panel.querySelector('[data-act="scare"]');
        if (sc) sc.textContent = store.get('hw-scare', true) ? 'jumpscares: on' : 'jumpscares: off';
    }

    function openPanel(open) {
        panel.hidden = !open;
        counter.setAttribute('aria-expanded', String(open));
        if (open) paintPanel();
    }
    counter.addEventListener('click', () => openPanel(panel.hidden));
    panel.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]');
        if (!act) return;
        if (act.dataset.act === 'close') openPanel(false);
        if (act.dataset.act === 'bats') setBats(!batsOn());
        if (act.dataset.act === 'scare') { store.set('hw-scare', !store.get('hw-scare', true)); paintPanel(); }
        if (act.dataset.act === 'boo') { store.set('hw-boo', !booOn()); paintPanel(); scheduleApparition(); }
    });
    // tap anywhere else closes it, like any other popover on a phone
    document.addEventListener('click', (e) => {
        if (!panel.hidden && !panel.contains(e.target) && !counter.contains(e.target)) openPanel(false);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') openPanel(false); });
    paintCounter();

    // ---------- this page's ghost ----------
    const mine = GHOSTS.find((g) => g.id === page);
    const spot = mine && !caught.includes(mine.id) && document.querySelector(mine.anchor);
    if (spot) {
        const ghost = document.createElement('button');
        ghost.type = 'button';
        ghost.className = 'hw-ghost hw-pose-' + mine.pose;
        ghost.setAttribute('aria-label', 'A ghost is hiding here. Tap to catch it.');
        // the art sits in its own box so a pose can clip it (behind an
        // edge, into the floor) while the button keeps a full hit area
        ghost.innerHTML = '<span class="hw-ghost-art">' + GHOST + '</span>';
        spot.classList.add('hw-anchor', 'hw-anchor-' + mine.pose);
        spot.appendChild(ghost);
        // Some anchors are re-rendered by their page (the mess note is set
        // with textContent), which would drop the ghost. Put it back.
        new MutationObserver(() => {
            if (!ghost.disabled && !spot.contains(ghost)) spot.appendChild(ghost);
        }).observe(spot, { childList: true });
        // It notices you: once it has been on screen for a moment it
        // comes out a little further (the peek and the sink poses use it).
        if ('IntersectionObserver' in window) {
            let t;
            new IntersectionObserver((es) => {
                const vis = es[0].isIntersecting;
                clearTimeout(t);
                if (vis) t = setTimeout(() => ghost.classList.add('seen'), 1400);
            }, { threshold: 0.9 }).observe(ghost);
        }
        ghost.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (ghost.disabled) return;
            ghost.disabled = true;
            const r = ghost.getBoundingClientRect();
            if (!caught.includes(mine.id)) caught.push(mine.id);
            store.set('hw-caught', caught);
            ghost.classList.add('poof');
            setTimeout(() => ghost.remove(), reduce ? 0 : 650);
            paintCounter();
            counter.classList.remove('bump');
            void counter.offsetWidth;
            counter.classList.add('bump');
            if (won()) {
                win(r.left + r.width / 2, r.top + r.height / 2);
            } else {
                burst(r.left + r.width / 2, r.top + r.height / 2, 10);
                const left = GHOSTS.length - caught.length;
                say('Caught ' + caught.length + '/' + GHOSTS.length + '.',
                    left + ' more haunt' + (left === 1 ? 's' : '') + ' linkCS. The pumpkin knows where.');
            }
        });
    }

    function win(x, y) {
        burst(x, y, 24);
        setTimeout(() => burst(window.innerWidth / 2, window.innerHeight / 3, 60), 250);
        say('Ghostbuster 2026', 'All five caught. The lantern stays lit.', true);
        paintLantern();
        paintBadge();
    }

    // ---------- the reward badge (home page only) ----------
    function paintBadge() {
        if (!isHome || !won() || document.querySelector('.hw-badge')) return;
        const block = document.querySelector('.hero-block');
        if (!block) return;
        const badge = document.createElement('span');
        badge.className = 'hw-badge';
        badge.innerHTML = GHOST + '<span>Ghostbuster 2026</span>';
        block.appendChild(badge);
    }
    paintBadge();

    // ---------- trick or treat ----------
    const TREATS = [
        'A full-size chocolate bar. Rare drop.',
        'Candy corn. Divisive, but it is free.',
        'One extra hour of sleep. Use it.',
        'A mess dessert that is actually good.',
        'Your code compiled on the first try. Once.'
    ];
    const TRICKS = [
        'Just a bat. It meant well.',
        'A bat. It was looking for the Rooms page.',
        'Bat on the loose. It will not touch your timetable.'
    ];
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    function trickOrTreat(x, y) {
        if (Math.random() < 0.6) {
            burst(x, y, 18);
            say('Treat!', pick(TREATS));
        } else {
            flyBat();
            say('Trick.', pick(TRICKS));
        }
    }

    // Long-press the logo on any page. A normal tap still goes home: the
    // click is only swallowed when a long press just fired, so the logo
    // link keeps working exactly as before.
    const brand = document.querySelector('.topbar .brand');
    if (brand) {
        let timer = null, fired = false, sx = 0, sy = 0;
        brand.addEventListener('pointerdown', (e) => {
            fired = false;
            sx = e.clientX; sy = e.clientY;
            clearTimeout(timer);
            timer = setTimeout(() => { fired = true; trickOrTreat(sx, sy); }, 550);
        });
        const cancel = () => clearTimeout(timer);
        brand.addEventListener('pointerup', cancel);
        brand.addEventListener('pointercancel', cancel);
        brand.addEventListener('pointerleave', cancel);
        brand.addEventListener('pointermove', (e) => {
            if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 12) cancel();
        });
        brand.addEventListener('contextmenu', (e) => e.preventDefault());
        brand.addEventListener('click', (e) => {
            if (fired) { e.preventDefault(); fired = false; return; }
            // On the home page the wordmark is not a link, so a plain tap
            // is free to use: trick or treat on every tap there.
            if (isHome && e.target.closest('.brand-name')) trickOrTreat(e.clientX, e.clientY);
        }, true);
    }

    // ---------- bats drifting behind the home page ----------
    let bats = null;
    const batsOn = () => store.get('hw-bats', true);
    function setBats(on) {
        store.set('hw-bats', on);
        if (bats) bats.classList.toggle('paused', !on);
        paintBatsButton();
    }
    function paintBatsButton() {
        const b = panel.querySelector('[data-act="bats"]');
        if (b) b.textContent = batsOn() ? 'pause bats' : 'release bats';
    }
    if (isHome && !reduce) {
        bats = document.createElement('div');
        bats.className = 'hw-bats';
        bats.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 3; i++) {
            const b = document.createElement('span');
            b.className = 'hw-bat hw-bat-' + i;
            b.innerHTML = '<span class="hw-bob">' + BAT + '</span>';
            bats.appendChild(b);
        }
        document.body.appendChild(bats);
        bats.classList.toggle('paused', !batsOn());
    }
    // ---------- moon: in the empty sky right of the wordmark ----------
    // Placed from the real layout, because every page's bar is different:
    // part way across the gap between the brand and the buttons, never
    // above the top of the page (it used to get clipped on sub-pages).
    function placeMoon() {
        const moon = topbar && topbar.querySelector('.hw-moon');
        const brandEl = topbar && topbar.querySelector('.brand');
        const utilsEl = topbar && topbar.querySelector('.topbar-utils');
        if (!moon || !brandEl) return;
        const t = topbar.getBoundingClientRect();
        const b = brandEl.getBoundingClientRect();
        const u = utilsEl ? utilsEl.getBoundingClientRect() : null;
        // buttons wrapped onto their own row (home on a phone): the gap
        // runs from the wordmark to the right edge of the bar
        const sameRow = u && u.top < b.bottom - 4;
        const right = sameRow ? u.left : t.right;
        const gap = right - b.right;
        moon.hidden = gap < 54;
        moon.style.left = (b.right - t.left + gap * (sameRow ? 0.5 : 0.62) - 14) + 'px';
        moon.style.top = Math.max(2, b.top - t.top - 6) + 'px';
        // The scene stands in the same gap, right up to the buttons, so no
        // button sits on top of the house. Where the gap is too narrow
        // (sub-pages on a phone) or the buttons wrap under the wordmark
        // (home on a phone) there is no ground for it, so it stays away.
        const scene = topbar.querySelector('.hw-scene');
        if (scene) {
            scene.style.display = (sameRow && gap >= 170) ? '' : 'none';
            scene.style.right = (t.right - right + 10) + 'px';
            scene.style.width = Math.min(gap - 20, 340) + 'px';
        }
    }

    // ---------- the day: webs grow from 25 Oct (stage 1) to 31 Oct (7) ----------
    // Gulf date, so everyone sees the same stage on the same day.
    // ?spooky_day=25..31 previews a stage (kept for the visit, like ?spooky).
    const params = new URLSearchParams(location.search);
    let forced = params.get('spooky_day');
    try {
        if (forced) sessionStorage.setItem('spooky-day', forced);
        else forced = sessionStorage.getItem('spooky-day');
    } catch (e) {}
    function hwDay() {
        const f = parseInt(forced, 10);
        if (f >= 25 && f <= 31) return f;
        const g = new Date(Date.now() + 4 * 3600e3);      // UTC fields now read Gulf time
        const m = g.getUTCMonth(), d = g.getUTCDate();
        if (m === 9 && d >= 25) return d;
        return (m < 9 || (m === 9 && d < 25)) ? 25 : 31;   // previews outside the week
    }
    const stage = hwDay() - 24;                            // 1..7

    // A corner web, corner at (0,0), opening towards +x/+y; CSS flips it
    // into the other corners. Everything irregular comes from a seeded
    // random stream (one seed per web), so a web looks the same on every
    // load, and day N is always day N-1 plus more silk: radials are added
    // in a fixed order, rings grow outwards, dew and loose threads come late.
    const WEB_ANGLES = [24, 62, 43, 8, 82, 33, 53, 72];
    function seeded(seed) {
        let x = seed >>> 0 || 1;
        return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; };
    }
    let webCount = 0;
    function webSVG(R, st, seed) {
        const rnd = seeded(seed * 7919 + 13);
        const f = (v) => v.toFixed(1);
        const pt = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
        const n = Math.min(8, st + 1);
        // draw every radial's jitter even when unused, so adding one on a
        // later day never reshuffles the ones already there
        const all = WEB_ANGLES.map((a) => {
            const short = rnd() < 0.22;
            return {
                a: (a + (rnd() - 0.5) * 9) * Math.PI / 180,
                l: R * (short ? 0.55 + rnd() * 0.15 : 0.84 + rnd() * 0.16),
                bend: (rnd() - 0.5) * 0.12
            };
        });
        const rad = all.slice(0, n).sort((p, q) => p.a - q.a);
        const id = 'hw-silk-' + seed;
        let out = '<defs><radialGradient id="' + id + '" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="' + R + '">' +
            '<stop offset="0" stop-color="#F4EEFF" stop-opacity=".75"/>' +
            '<stop offset=".55" stop-color="#D9CCF5" stop-opacity=".45"/>' +
            '<stop offset="1" stop-color="#B9A8E6" stop-opacity=".08"/></radialGradient></defs>' +
            '<g class="hw-web-sway" stroke="url(#' + id + ')">';
        // radials: a faint bow each, like silk that is not quite taut
        let d = '';
        rad.forEach((r) => {
            const [x, y] = pt(r.l, r.a);
            const [cx, cy] = pt(r.l / 2, r.a + r.bend);
            d += 'M0 0Q' + f(cx) + ' ' + f(cy) + ' ' + f(x) + ' ' + f(y);
        });
        out += '<path class="hw-web-silk" stroke-width="0.9" d="' + d + '"/>';
        // the spiral: each span sags towards the hub; outer turns are finer
        const rings = st - 1;
        const spans = [];
        for (let k = 0; k < rings; k++) {
            let rd = '';
            const base = R * (0.17 + 0.125 * k);
            for (let i = 0; i + 1 < rad.length; i++) {
                const r1 = base + i * R * 0.012, r2 = base + (i + 1) * R * 0.012;
                if (rad[i].l < r1 || rad[i + 1].l < r2) continue;
                const [x1, y1] = pt(r1, rad[i].a), [x2, y2] = pt(r2, rad[i + 1].a);
                const sag = 0.74 + rnd() * 0.1;
                rd += 'M' + f(x1) + ' ' + f(y1) + 'Q' + f((x1 + x2) / 2 * sag) + ' ' + f((y1 + y2) / 2 * sag) + ' ' + f(x2) + ' ' + f(y2);
                spans.push([x1, y1]);
            }
            if (rd) out += '<path class="hw-web-silk" stroke-width="' + (0.8 - k * 0.07).toFixed(2) + '" d="' + rd + '"/>';
        }
        // late in the week a thread or two has come loose and hangs free
        if (st >= 5) {
            const loose = st >= 7 ? 2 : 1;
            for (let i = 0; i < loose; i++) {
                const r = rad[rad.length - 1 - i * 2] || rad[0];
                const [x, y] = pt(r.l * 0.7, r.a);
                // short, and never hanging below the web's own square, so
                // a loose thread cannot drift down over the logo
                const len = Math.min(R * (0.16 + rnd() * 0.1), R * 0.95 - y);
                if (len < R * 0.08) continue;
                out += '<path class="hw-web-silk hw-web-loose" stroke-width="0.6" d="M' + f(x) + ' ' + f(y) +
                    'c' + f(len * 0.1) + ' ' + f(len * 0.35) + ' ' + f(-len * 0.25) + ' ' + f(len * 0.6) + ' ' + f(-len * 0.05) + ' ' + f(len) + '"/>';
            }
        }
        // dew: a few drops sitting on the spiral, each with a slow glint
        const drops = st < 3 ? 0 : Math.min(5, st - 1);
        for (let i = 0; i < drops && spans.length; i++) {
            const [x, y] = spans[Math.floor(rnd() * spans.length)];
            const delay = (rnd() * 9).toFixed(1);
            out += '<circle class="hw-dew-glow" cx="' + f(x) + '" cy="' + f(y) + '" r="2.6" style="animation-delay:-' + delay + 's"/>' +
                '<circle class="hw-dew" cx="' + f(x) + '" cy="' + f(y) + '" r="1"/>';
        }
        out += '</g>';
        const lo = rad[0].a, hi = rad[rad.length - 1].a, L = Math.max(...rad.map((r) => r.l));
        const [ax, ay] = pt(L, lo), [bx, by] = pt(L, hi);
        // hit area: the wedge the threads span, not the whole corner box
        const hit = 'M0 0L' + f(ax) + ' ' + f(ay) + 'A' + f(L) + ' ' + f(L) + ' 0 0 1 ' + f(bx) + ' ' + f(by) + 'Z';
        return '<svg viewBox="0 0 ' + R + ' ' + R + '" width="' + R + '" height="' + R + '">' +
            '<path class="hw-web-hit" d="' + hit + '"/>' + out + '</svg>';
    }

    function addWeb(host, corner, R) {
        if (R < 26) return;
        const w = document.createElement('div');
        w.className = 'hw-web hw-web-' + corner;
        w.setAttribute('aria-hidden', 'true');
        // seed: which page, which corner, which web on the page
        let seed = ++webCount * 31 + corner.charCodeAt(1);
        for (const ch of page) seed = (seed * 33 + ch.charCodeAt(0)) >>> 0;
        w.innerHTML = webSVG(Math.round(R), stage, seed);
        host.appendChild(w);
    }

    // Tap a web and it is swept away, for this page view only: it grows
    // back on the next load, at that day's stage.
    document.addEventListener('click', (e) => {
        const hit = e.target.closest && e.target.closest('.hw-web-hit');
        if (!hit) return;
        const web = hit.closest('.hw-web');
        if (reduce) { web.remove(); return; }
        web.classList.add('swept');
        setTimeout(() => web.remove(), 700);
    });

    function buildWebs() {
        document.querySelectorAll('.hw-web').forEach((w) => w.remove());
        webCount = 0;
        const main = document.querySelector('main') || document.body;
        // page corners: only as deep as the empty space above the top bar's
        // content, so a thread can never cross the logo or a button
        if (topbar) {
            const tb = topbar.getBoundingClientRect();
            const pad = parseFloat(getComputedStyle(topbar).paddingTop) || 0;
            const free = tb.top + window.scrollY + pad - 4;
            const R = Math.min(free, window.innerWidth < 600 ? 64 : 92);
            addWeb(document.body, 'tl', R);
            if (stage >= 2) addWeb(document.body, 'tr', R);
        }
        // bottom-right of the page, in the padding under the last content
        if (stage >= 4) {
            const last = main.lastElementChild;
            const docH = document.documentElement.scrollHeight;
            if (last) {
                const free = docH - (last.getBoundingClientRect().bottom + window.scrollY) - 8;
                addWeb(document.body, 'br', Math.min(free, 90));
            }
        }
        // home: the empty bottom-right cell of course cards with an odd
        // number of links (a lone link leaves that corner bare)
        if (isHome && stage >= 3) {
            const bare = [...document.querySelectorAll('#course-grid .course-links')]
                .filter((l) => l.children.length % 2 === 1)
                .map((l) => l.parentElement);
            const take = stage >= 6 ? bare.length : stage >= 5 ? 2 : 1;
            bare.slice(0, take).forEach((card) => {
                card.classList.add('hw-web-host');
                const links = card.querySelector('.course-links');
                const last = links.lastElementChild.getBoundingClientRect();
                const c = card.getBoundingClientRect();
                const R = Math.min(c.right - last.right - 6, c.bottom - last.top - 6, 64);
                addWeb(card, 'br', R);
            });
        }
    }

    // ---------- 31 Oct: a spider lowers itself, once per visit ----------
    function spider() {
        if (stage < 7 || !isHome || reduce || !topbar) return;
        try {
            if (sessionStorage.getItem('hw-spider')) return;
            sessionStorage.setItem('hw-spider', '1');
        } catch (e) {}
        const brandEl = topbar.querySelector('.brand');
        const t = topbar.getBoundingClientRect(), b = brandEl.getBoundingClientRect();
        const u = topbar.querySelector('.topbar-utils').getBoundingClientRect();
        const sameRow = u.top < b.bottom - 4;
        const right = sameRow ? u.left : t.right;
        if (right - b.right < 90) return;
        const x = b.right + (right - b.right) * 0.84 + window.scrollX;
        const depth = b.top + b.height / 2 + window.scrollY;
        const sp = document.createElement('div');
        sp.className = 'hw-spider';
        sp.style.left = x + 'px';
        sp.innerHTML =
            '<span class="hw-thread"></span>' +
            '<button type="button" class="hw-bug" aria-label="A spider. Tap to send it back up.">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><g class="hw-legs"><path d="M9 11 3 7M9 13l-6 0M9 14l-5 5M15 11l6-4M15 13h6M15 14l5 5"/></g>' +
            '<ellipse cx="12" cy="14" rx="4.2" ry="5"/><circle cx="12" cy="8.6" r="2.6"/></svg></button>';
        document.body.appendChild(sp);
        requestAnimationFrame(() => requestAnimationFrame(() => sp.style.setProperty('--drop', depth + 'px')));
        sp.querySelector('.hw-bug').addEventListener('click', () => {
            sp.classList.add('up');
            sp.style.setProperty('--drop', '0px');
            setTimeout(() => sp.remove(), 1800);
        });
    }

    // ---------- apparitions: a big faint ghost, now and then ----------
    // One at a time, every 30-60 s (the first after ~15 s, or right away
    // with ?boo=now), behind the content so text stays readable, never
    // catching a tap. Paused while the tab is hidden; off for reduced
    // motion; switchable in the pumpkin panel.
    const booOn = () => store.get('hw-boo', true);
    const APP =
        '<svg viewBox="0 0 200 230" aria-hidden="true"><defs>' +
        '<linearGradient id="hw-app-fade" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#EDE6FF"/><stop offset=".62" stop-color="#EDE6FF" stop-opacity=".85"/>' +
        '<stop offset="1" stop-color="#EDE6FF" stop-opacity="0"/></linearGradient></defs>' +
        '<path fill="url(#hw-app-fade)" d="M100 8C52 8 28 46 28 96v84c8-10 17-14 26-4s14 26 24 22 12-24 22-24 14 30 24 30 14-20 24-24 16 4 24 12V96c0-50-24-88-72-88z"/>' +
        '<g class="hw-app-eyes" fill="#0B0716"><ellipse cx="78" cy="88" rx="9" ry="14"/><ellipse cx="122" cy="88" rx="9" ry="14"/>' +
        '<ellipse cx="100" cy="128" rx="10" ry="7"/></g></svg>';
    let appTimer = null, appAnims = [], appEl = null;
    function scheduleApparition(ms) {
        clearTimeout(appTimer);
        if (reduce || !booOn() || document.hidden) return;
        appTimer = setTimeout(apparition, ms != null ? ms : 30000 + Math.random() * 30000);
    }
    function apparition() {
        if (appEl || document.hidden || !booOn()) { scheduleApparition(); return; }
        const W = window.innerWidth, H = window.innerHeight;
        const size = Math.max(W * (0.25 + Math.random() * 0.15), 200);
        const peak = (0.18 + Math.random() * 0.07).toFixed(2);
        const kinds = ['rise', 'drift', 'corner', 'look'];
        const kind = params.get('boo_kind') || kinds[Math.floor(Math.random() * kinds.length)];
        const el = document.createElement('div');
        el.className = 'hw-apparition';
        el.setAttribute('aria-hidden', 'true');
        el.style.width = size + 'px';
        el.innerHTML = APP;
        document.body.appendChild(el);
        appEl = el;
        const h = size * 1.15, dur = 4000 + Math.random() * 4000;
        const rx = Math.random() * (W - size);
        const left = Math.random() < 0.5;
        const T = (x, y, r, sc) => 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px) rotate(' + (r || 0) + 'deg) scaleX(' + (sc || 1) + ')';
        let frames;
        if (kind === 'rise') {            // up from the bottom edge
            frames = [
                { transform: T(rx, H - h * 0.15, -3), opacity: 0 },
                { transform: T(rx, H - h * 0.7, 2), opacity: peak, offset: 0.45 },
                { transform: T(rx + 20, H - h * 1.0, -2), opacity: 0 }];
        } else if (kind === 'drift') {    // across, behind everything
            const y = H * (0.15 + Math.random() * 0.45);
            const x0 = left ? -size * 0.9 : W - size * 0.1, x1 = left ? W - size * 0.1 : -size * 0.9;
            frames = [
                { transform: T(x0, y, left ? 6 : -6, left ? 1 : -1), opacity: 0 },
                { transform: T((x0 + x1) / 2, y - 30, 0, left ? 1 : -1), opacity: peak, offset: 0.5 },
                { transform: T(x1, y + 10, left ? 6 : -6, left ? 1 : -1), opacity: 0 }];
        } else {                          // in a corner, half off the edge
            const x = left ? -size * 0.35 : W - size * 0.65;
            const y = Math.random() < 0.5 ? -h * 0.15 : H - h * 0.8;
            frames = [
                { transform: T(x, y + 20, left ? 8 : -8), opacity: 0 },
                { transform: T(x, y, left ? 4 : -4), opacity: peak, offset: 0.35 },
                { transform: T(x, y - 6, left ? -2 : 2), opacity: peak, offset: 0.7 },
                { transform: T(x, y - 14, 0), opacity: 0 }];
        }
        appAnims = [el.animate(frames, { duration: dur, easing: 'ease-in-out', fill: 'forwards' })];
        if (kind === 'look') {            // it turns to look at you, then goes
            const eyes = el.querySelector('.hw-app-eyes');
            const dx = left ? 14 : -14;
            appAnims.push(eyes.animate([
                { transform: 'translate(0,0)' },
                { transform: 'translate(0,0)', offset: 0.35 },
                { transform: 'translate(' + dx + 'px,4px)', offset: 0.5 },
                { transform: 'translate(' + dx + 'px,4px)', offset: 0.8 },
                { transform: 'translate(0,0)' }], { duration: dur, fill: 'forwards' }));
        }
        appAnims[0].onfinish = () => { el.remove(); appEl = null; appAnims = []; scheduleApparition(); };
    }
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearTimeout(appTimer);
            appAnims.forEach((a) => a.pause());
        } else if (appEl) {
            appAnims.forEach((a) => a.play());
        } else {
            scheduleApparition();
        }
    });

    // ---------- the rare jumpscare on a link click ----------
    // About 1 in 20 link clicks, at most once a day per visitor, never on
    // the first click of a first visit. A ghost face lunges at the screen
    // for ~700 ms and then the click carries on. One smooth swell, no
    // flashing, no sound. Same-tab links wait for it; new-tab links open
    // at once (a delayed window.open gets blocked) and the scare waits
    // for you on this page when you come back. ?scare=now arms the next click.
    const today = new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10);
    try { if (params.get('scare') === 'now') sessionStorage.setItem('hw-scare-now', '1'); } catch (e) {}
    const SCARE =
        '<svg viewBox="0 0 200 220" aria-hidden="true">' +
        '<path fill="#EFE8FF" d="M100 6C48 6 22 48 22 100v104l20-16 20 16 19-16 19 16 19-16 19 16 20-16 20 16V100C178 48 152 6 100 6z"/>' +
        '<g fill="#07040F"><path d="M58 74c6-14 30-14 34 2 3 14-6 30-18 30S52 88 58 74z"/>' +
        '<path d="M142 74c-6-14-30-14-34 2-3 14 6 30 18 30s22-18 16-32z"/>' +
        '<path d="M100 120c-16 0-26 14-24 34 2 22 12 30 24 30s22-8 24-30c2-20-8-34-24-34z"/></g></svg>';
    function scareArmed() {
        if (reduce || !store.get('hw-scare', true)) return false;
        let now = false;
        try { now = sessionStorage.getItem('hw-scare-now') === '1'; } catch (e) {}
        if (now) return true;
        if (!store.get('hw-clicked', false)) { store.set('hw-clicked', true); return false; }
        if (store.get('hw-scare-day', '') === today) return false;
        return Math.random() < 0.05;
    }
    function spendScare() {
        store.set('hw-clicked', true);
        store.set('hw-scare-day', today);
        try { sessionStorage.removeItem('hw-scare-now'); } catch (e) {}
    }
    function playScare(done) {
        const o = document.createElement('div');
        o.className = 'hw-scare';
        o.setAttribute('aria-hidden', 'true');
        o.innerHTML = '<div class="hw-scare-face">' + SCARE + '</div>';
        document.body.appendChild(o);
        const dur = 720;
        o.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }],
            { duration: dur, easing: 'ease-out', fill: 'forwards' });
        o.firstChild.animate([
            { transform: 'translate(0,0) scale(0.12)', opacity: 0 },
            { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0.42 },
            { transform: 'translate(-6px,3px) scale(1.02)', offset: 0.5 },
            { transform: 'translate(5px,-4px) scale(1.04)', offset: 0.58 },
            { transform: 'translate(-3px,2px) scale(1.05)', offset: 0.66 },
            { transform: 'translate(0,0) scale(1.07)', opacity: 1, offset: 0.82 },
            { transform: 'translate(0,0) scale(1.12)', opacity: 0 }
        ], { duration: dur, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
        setTimeout(() => { o.remove(); if (done) done(); }, dur);
    }
    let scareLater = 0;
    document.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.target.closest && e.target.closest('a[href]');
        if (!a || a.hasAttribute('download') || a.closest('.hw-panel, .hw-counter, .hw-ghost, .hw-badge')) return;
        const href = a.getAttribute('href');
        if (!href || href[0] === '#' || /^(javascript|mailto|tel):/i.test(href)) return;
        if (!scareArmed()) return;
        spendScare();
        if (a.target && a.target !== '_self') {
            scareLater = Date.now();           // let the new tab open untouched
            return;
        }
        e.preventDefault();
        const to = a.href;
        playScare(() => location.assign(to));
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && scareLater && Date.now() - scareLater < 120000) {
            scareLater = 0;
            setTimeout(() => playScare(), 250);
        }
    });

    // ---------- layout-dependent bits, once the page has settled ----------
    function layoutBits() { placeMoon(); buildWebs(); }
    if (document.readyState === 'complete') layoutBits();
    else window.addEventListener('load', layoutBits);
    placeMoon();
    let rz;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layoutBits, 200); });
    window.addEventListener('load', () => setTimeout(spider, 900));
    if (document.readyState === 'complete') setTimeout(spider, 900);
    scheduleApparition(params.get('boo') === 'now' ? 400 : 15000);
})();
