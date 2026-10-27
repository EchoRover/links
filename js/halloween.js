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

    // One ghost per page. `spot` is a non-link element the ghost tucks
    // into the end of, so it sits in the text flow and can never land on
    // top of a button. The page key is the last path segment, which is
    // the same locally (/pages/bus.html) and on Vercel (/bus, cleanUrls).
    const GHOSTS = [
        { id: 'index', label: 'Home',       href: '/',                 spot: '.updates-col:last-child .updates-col-title' },
        { id: 'bus',   label: 'Bus',        href: '/pages/bus.html',   spot: '.bus-sub' },
        { id: 'mess',  label: 'Mess',       href: '/pages/mess.html',  spot: '.warn-banner' },
        { id: 'week',  label: 'Timetable',  href: '/pages/week.html',  spot: '.wk-title' },
        { id: 'rooms', label: 'Free Rooms', href: '/pages/rooms.html', spot: '.rooms-foot' }
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
    const BAT =
        '<svg viewBox="0 0 60 26" aria-hidden="true">' +
        '<path class="hw-wing hw-wing-l" d="M30 12C24 4 14 2 2 6c5 2 6 6 5 9 4-2 8-1 10 2 3-3 8-3 13-5z"/>' +
        '<path class="hw-wing hw-wing-r" d="M30 12c6-8 16-10 28-6-5 2-6 6-5 9-4-2-8-1-10 2-3-3-8-3-13-5z"/>' +
        '<ellipse cx="30" cy="13" rx="4" ry="6"/><path d="M27 8l1-4 2 3 2-3 1 4z"/></svg>';

    // ---------- toast: one line at a time, read out politely ----------
    const toast = document.createElement('div');
    toast.className = 'hw-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    let toastTimer;
    function say(title, line) {
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
        b.innerHTML = BAT;
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
        sky.innerHTML =
            '<span class="hw-moon"></span>' +
            '<svg class="hw-skyline" viewBox="0 0 600 24" preserveAspectRatio="none">' +
            '<path d="M0 24V18h30v-6h18v6h22V9h10V4h6v5h10v15h20v-8l12-6 12 6v8h40v-12h26v12h30V14h8l6-8 6 8h8v10h44v-7h34v7h28V11h14v-5h4v5h14v13h36v-9l14-8 14 8v9h42v-5h26v5h34V16h20v8z"/>' +
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
            (isHome && !reduce ? '<button type="button" class="hw-mini" data-act="bats"></button>' : '') +
            '<button type="button" class="hw-mini" data-act="close">close</button></div>';
        paintBatsButton();
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
    });
    // tap anywhere else closes it, like any other popover on a phone
    document.addEventListener('click', (e) => {
        if (!panel.hidden && !panel.contains(e.target) && !counter.contains(e.target)) openPanel(false);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') openPanel(false); });
    paintCounter();

    // ---------- this page's ghost ----------
    const mine = GHOSTS.find((g) => g.id === page);
    const spot = mine && !caught.includes(mine.id) && document.querySelector(mine.spot);
    if (spot) {
        const ghost = document.createElement('button');
        ghost.type = 'button';
        ghost.className = 'hw-ghost';
        ghost.setAttribute('aria-label', 'A ghost is hiding here. Tap to catch it.');
        ghost.innerHTML = GHOST;
        spot.appendChild(ghost);
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
        say('Ghostbuster 2026.', 'All five caught. The lantern stays lit.');
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
        for (let i = 0; i < 4; i++) {
            const b = document.createElement('span');
            b.className = 'hw-bat hw-bat-' + i;
            b.innerHTML = BAT;
            bats.appendChild(b);
        }
        document.body.appendChild(bats);
        bats.classList.toggle('paused', !batsOn());
    }
})();
