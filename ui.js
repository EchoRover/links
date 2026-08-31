// ============================================================
// UI behaviors: hide-mode toggle, interactive dot canvas,
// cursor ambient, more-toggle, linkeen tap, course-box equalize.
// (Theme toggle lives in scripts.js — do not add a second one
//  here or the two would cancel each other out on every click.)
// ============================================================

// HIDE-MODE toggle — only revealed when scrolled to the bottom
(function () {
    const btn = document.getElementById('play-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const on = document.body.classList.toggle('play-mode');
        btn.setAttribute('aria-pressed', String(on));
        const label = btn.querySelector('.play-toggle-label');
        if (label) label.textContent = on ? 'show' : 'hide';
    });

    function check() {
        const nearBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 80);
        btn.classList.toggle('visible', nearBottom || document.body.classList.contains('play-mode'));
    }
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    check();
})();

// ELECTRONS — small lights sliding along circuit paths, with tiny perpendicular
// wobble. No mouse interaction, no physics — just constant motion. Lightweight.
(function () {
    const canvas = document.getElementById('dots');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const svg = document.querySelector('.circuit-top');
    const paths = ['#cb1','#cb2','#cb3','#cb4','#cb5','#cb6']
        .map(id => svg && svg.querySelector(id))
        .filter(Boolean);
    if (!paths.length) return;

    const pathLengths = paths.map(p => p.getTotalLength());
    const DOT_COUNT = 14;

    let dpr = 1, W = 0, H = 0;
    const dots = [];

    function fit() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function pointAtT(pathIdx, t) {
        const p = paths[pathIdx];
        const len = pathLengths[pathIdx];
        const svgPt = p.getPointAtLength(t * len);
        const m = p.getScreenCTM();
        if (!m) return { x: svgPt.x, y: svgPt.y };
        return { x: svgPt.x * m.a + m.e, y: svgPt.y * m.d + m.f };
    }

    function spawn() {
        dots.length = 0;
        for (let i = 0; i < DOT_COUNT; i++) {
            dots.push({
                pi: i % paths.length,
                t: Math.random(),
                speed: 0.0004 + Math.random() * 0.0005,
                dir: Math.random() < 0.5 ? 1 : -1,
                wobblePhase: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.04 + Math.random() * 0.03,
                size: 2.2 + Math.random() * 1.4,
            });
        }
    }

    function rgbFromVar(name, fallback) {
        const v = getComputedStyle(document.documentElement)
            .getPropertyValue(name).trim();
        return v || fallback;
    }

    let running = true;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) running = false;
        else if (!running) { running = true; requestAnimationFrame(step); }
    });

    function step() {
        if (!running) return;
        ctx.clearRect(0, 0, W, H);
        const color = rgbFromVar('--coral', '#3B5C9C');
        ctx.fillStyle = color;

        for (const d of dots) {
            d.t += d.speed * d.dir;
            if (d.t > 1) d.t -= 1;
            else if (d.t < 0) d.t += 1;
            d.wobblePhase += d.wobbleSpeed;

            const pos = pointAtT(d.pi, d.t);
            const wobble = Math.sin(d.wobblePhase) * 2.5;
            const x = pos.x + wobble;
            const y = pos.y + Math.cos(d.wobblePhase * 0.7) * 1.5;

            ctx.globalAlpha = 0.28;
            ctx.beginPath();
            ctx.arc(x, y, d.size * 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.95;
            ctx.beginPath();
            ctx.arc(x, y, d.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        requestAnimationFrame(step);
    }

    let resizeT;
    window.addEventListener('resize', () => {
        clearTimeout(resizeT);
        resizeT = setTimeout(() => { fit(); spawn(); }, 150);
    });

    requestAnimationFrame(() => {
        fit();
        spawn();
        requestAnimationFrame(step);
    });
})();

// More-toggle — expand/collapse the secondary quick links
(function () {
    const btn = document.getElementById('more-toggle');
    const sec = document.getElementById('quick-secondary');
    if (!btn || !sec) return;
    btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        sec.setAttribute('aria-hidden', String(expanded));
        sec.classList.toggle('open');
        const label = btn.querySelector('.util-more-label');
        if (label) label.textContent = expanded ? '+ more' : '× hide';
    });
})();

// LINKEEN pill — tap-toggle the popup on touch devices
(function () {
    const el = document.getElementById('pill-linkeen');
    if (!el) return;
    const isTouch = window.matchMedia('(hover: none)').matches;
    if (!isTouch) return;
    el.addEventListener('click', (e) => {
        if (!el.classList.contains('show-popup')) {
            e.preventDefault();
            el.classList.add('show-popup');
            setTimeout(() => el.classList.remove('show-popup'), 3000);
        }
    });
})();

// Equalize ALL course box heights (tallest sets the height for everyone).
(function () {
    function equalize() {
        const boxes = Array.from(document.querySelectorAll('.course-list .box'));
        if (!boxes.length) return;
        boxes.forEach(b => { b.style.height = 'auto'; });
        requestAnimationFrame(() => {
            const maxH = Math.max(...boxes.map(b => b.offsetHeight));
            boxes.forEach(b => { b.style.height = maxH + 'px'; });
        });
    }
    window.addEventListener('load', equalize);
    window.addEventListener('resize', () => {
        clearTimeout(window._eqT);
        window._eqT = setTimeout(equalize, 120);
    });
})();
