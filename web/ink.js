/* PsychoPilot — shared ink: two-ink palette, canvas helpers, and the six generative volume covers.
   Every figure is a real psychological phenomenon. Exposes window.PPInk. */
window.PPInk = (() => {
  'use strict';
  /* ======================================================================
     Shared helpers
     ====================================================================== */
  const TAU = Math.PI * 2;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const inks = {};
  const readInks = () => {
    const cs = getComputedStyle(document.documentElement);
    ['paper', 'paper-2', 'blue', 'red', 'text', 'on-blue', 'mid'].forEach((k) => { inks[k] = cs.getPropertyValue('--' + k).trim(); });
  };
  readInks();
  const scheme = { matches: false }; // light only, by design
  const onScheme = [];
  scheme.addEventListener?.('change', () => { readInks(); onScheme.forEach((f) => f()); });

  /* seeded random, so generative figures are stable between visits */
  const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  /* canvas sized to its CSS box at device resolution */
  function fit(cv) {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  /* run `tick` with rAF only while `el` is on screen and the tab is visible */
  function loop(el, tick) {
    let on = false, raf = 0, last = 0;
    const step = (now) => { const dt = Math.min(0.033, (now - last) / 1000 || 0.016); last = now; tick(now / 1000, dt); raf = requestAnimationFrame(step); };
    const sync = () => {
      const run = on && !document.hidden && !reduce;
      if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(step); }
      if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    new IntersectionObserver((e) => { on = e[0].isIntersecting; sync(); }).observe(el);
    document.addEventListener('visibilitychange', sync);
  }

  /* ======================================================================
     2. Six volumes: each cover is generated from that Part's phenomenon
     ====================================================================== */
  const COVERS = {
    1: { bg: 'paper', fig: 'Fig. I — Neuron, after Cajal', draw: neuron },
    2: { bg: 'blue', fig: 'Fig. II — Moiré, figure & ground', draw: moire },
    3: { bg: 'paper', fig: 'Fig. III — Two affects, after Rothko', draw: fields },
    4: { bg: 'red', fig: 'Fig. IV — Conformity, after Asch', draw: crowd },
    5: { bg: 'paper', fig: 'Fig. V — A continuum, after A. Martin', draw: continuum },
    6: { bg: 'blue', fig: 'Fig. VI — Value, after Kahneman', draw: prospect },
  };

  /* I — a neuron drawn in fine ink; on hover a spike travels to the axon */
  const NEURON = (() => {
    const R = rng(11), segs = [], paths = [];
    const grow = (x, y, a, len, wd, depth, path) => {
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      segs.push([x, y, x2, y2, wd]);
      const p = path.concat([[x2, y2]]);
      if (depth <= 0) { paths.push(p.slice().reverse()); return; }
      const n = R() < .55 ? 2 : 1;
      for (let k = 0; k < n; k++) grow(x2, y2, a + (R() - .5) * 1.1 + (n === 2 ? (k ? .38 : -.38) : 0), len * (.66 + R() * .16), wd * .68, depth - 1, p);
    };
    for (let k = 0; k < 6; k++) grow(.5, .5, -Math.PI / 2 + (k - 2.5) * .55 + (R() - .5) * .3, .12 + R() * .04, 2.2, 3 + (R() < .5 ? 1 : 0), [[.5, .5]]);
    const axon = [[.5, .5]];
    for (let k = 1; k <= 12; k++) axon.push([.5 + Math.sin(k * .6) * .025, .5 + k * .04]);
    return { segs, paths, axon };
  })();
  function neuron(ctx, w, h, t, act, c) {
    const s = Math.min(w * 1.3, h * 1.05), ox = (w - s) / 2, oy = (h - s) / 2 - h * .1, P = ([x, y]) => [ox + x * s, oy + y * s];
    ctx.strokeStyle = c.fg; ctx.lineCap = 'round';
    NEURON.segs.forEach(([x1, y1, x2, y2, wd]) => { ctx.lineWidth = wd * s / 220; ctx.beginPath(); ctx.moveTo(...P([x1, y1])); ctx.lineTo(...P([x2, y2])); ctx.stroke(); });
    ctx.lineWidth = 1.6 * s / 220; ctx.beginPath(); NEURON.axon.forEach((p, i) => (i ? ctx.lineTo(...P(p)) : ctx.moveTo(...P(p)))); ctx.stroke();
    const end = P(NEURON.axon[NEURON.axon.length - 1]);
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(...end); ctx.lineTo(end[0] + k * s * .03, end[1] + s * .04); ctx.stroke(); }
    ctx.fillStyle = c.fg; ctx.beginPath(); ctx.ellipse(...P([.5, .5]), s * .045, s * .038, .3, 0, TAU); ctx.fill();
    // the spike: dendrite → soma → axon
    const path = NEURON.paths[2].concat(NEURON.axon), f = act ? (t * .45) % 1 : .62;
    const segLen = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
    let L = segLen.reduce((a, b) => a + b) * f, i = 0;
    while (i < segLen.length - 1 && L > segLen[i]) { L -= segLen[i]; i++; }
    const q = L / segLen[i], pt = P([path[i][0] + (path[i + 1][0] - path[i][0]) * q, path[i][1] + (path[i + 1][1] - path[i][1]) * q]);
    ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(pt[0], pt[1], s * .028, 0, TAU); ctx.fill();
  }

  /* II — two sets of concentric rings; a small shift makes waves appear that are not drawn anywhere */
  function moire(ctx, w, h, t, act, c) {
    const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) * .55, step = Math.max(3.4, w / 46);
    const shift = (act ? .07 + .05 * Math.sin(t * .9) : .07) * w;
    ctx.strokeStyle = c.fg; ctx.lineWidth = step * .42;
    for (const dx of [-shift / 2, shift / 2]) {
      ctx.beginPath();
      for (let r = step; r < R; r += step) { ctx.moveTo(cx + dx + r, cy); ctx.arc(cx + dx, cy, r, 0, TAU); }
      ctx.stroke();
    }
    ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(cx, cy, w * .09, 0, TAU); ctx.fill();
  }

  /* III — two soft fields of colour (valence above, arousal below) that breathe */
  function fields(ctx, w, h, t, act, c) {
    const b = act ? Math.sin(t * 1.2) * .03 : 0;
    ctx.save();
    ctx.filter = `blur(${Math.max(2, w * .025)}px)`;
    ctx.globalAlpha = .95; ctx.fillStyle = c.accent;
    ctx.fillRect(w * .06, h * .04, w * .88, h * (.5 + b));
    ctx.globalCompositeOperation = scheme.matches ? 'screen' : 'multiply';
    ctx.globalAlpha = .9; ctx.fillStyle = c.ink2;
    ctx.fillRect(w * .06, h * (.52 + b), w * .88, h * (.44 - b));
    ctx.restore();
  }

  /* IV — Isotype figures; the one who differs joins the crowd when you look */
  function crowd(ctx, w, h, t, act, c, dt, st) {
    st.k = st.k || 0;
    st.k += ((act ? 1 : 0) - st.k) * Math.min(1, (dt || 0) * 2.2);
    const cols = 5, rows = 4, cw = w / (cols + 1.6), ch = h / (rows + .9);
    const person = (x, y, s, col) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y - s * .55, s * .2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.roundRect(x - s * .24, y - s * .3, s * .48, s * .72, [s * .2, s * .2, s * .05, s * .05]); ctx.fill();
    };
    // a figure spans 1.17 s vertically (head top to feet), so size it by both
    // column and row pitch to keep a clear gap between neighbours
    const s = Math.min(cw * .9, ch * .74);
    // the last slot of the bottom row stays empty: the one who differs steps into it
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) if (r < rows - 1 || q < cols - 1) person(cw * (q + .8), ch * (r + .95), s, c.fg);
    const k = st.k, e = k * k * (3 - 2 * k);
    const x = cw * (cols + .55) * (1 - e) + cw * (cols - .2) * e, y = ch * (rows - .05);
    person(x, y, s, e > .5 ? c.fg : c.ink2);
  }

  /* V — hand-ruled lines: no break anywhere between "normal" and "disorder" */
  const LINES = (() => { const R = rng(23); return Array.from({ length: 26 }, () => Array.from({ length: 24 }, () => (R() - .5))); })();
  function continuum(ctx, w, h, t, act, c) {
    const top = h * .06, gap = (h * .86) / LINES.length;
    LINES.forEach((jit, i) => {
      const y = top + i * gap;
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, c.faint); grad.addColorStop(1, c.ink2);
      ctx.strokeStyle = grad; ctx.lineWidth = 1;
      ctx.beginPath();
      jit.forEach((j, k) => { const x = (k / (jit.length - 1)) * w; const yy = y + j * 1.4 + (act ? Math.sin(t * 1.4 + k * .5 + i) * .8 : 0); k ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); });
      ctx.stroke();
    });
    const f = act ? .5 + .38 * Math.sin(t * .8) : .64, y = top + 13 * gap;
    ctx.fillStyle = c.accent; ctx.beginPath(); ctx.moveTo(w * f, y - 7); ctx.lineTo(w * f + 6, y + 4); ctx.lineTo(w * f - 6, y + 4); ctx.fill();
  }

  /* VI — the prospect-theory value curve, drawn in points: losses loom larger than gains */
  const PTS = (() => { const R = rng(31); return Array.from({ length: 150 }, () => [R() * 2 - 1, (R() - .5), R()]); })();
  function prospect(ctx, w, h, t, act, c) {
    const cx = w * .5, cy = h * .34, sx = w * .46, sy = h * .3;
    ctx.strokeStyle = c.fg; ctx.globalAlpha = .45; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w * .04, cy); ctx.lineTo(w * .96, cy); ctx.moveTo(cx, h * .04); ctx.lineTo(cx, h * .92); ctx.stroke();
    ctx.globalAlpha = 1;
    const v = (x) => (x >= 0 ? Math.pow(x, .55) * .42 : -2.25 * Math.pow(-x, .55) * .42);
    PTS.forEach(([x, j, s], i) => {
      const y = v(x) + j * .06 + (act ? Math.sin(t * 2 + i) * .012 : 0);
      ctx.fillStyle = x < 0 ? c.accent : c.fg;
      ctx.beginPath(); ctx.arc(cx + x * sx, cy - y * sy, (.8 + s * 2.2) * w / 200, 0, TAU); ctx.fill();
    });
  }

  /* draw a Part's cover figure into `canvas`; animate while `host` is hovered/focused,
     while it is on screen on touch devices, or always (opts.auto) */
  function attach(host, canvas, partId, opts = {}) {
    const conf = COVERS[partId], st = {};
    let act = false, until = 0;
    const colors = () => {
      const onBlue = conf.bg === 'blue', onRed = conf.bg === 'red';
      return {
        fg: onBlue ? inks['on-blue'] : onRed ? '#fff8ee' : inks.text,
        accent: onRed ? inks.blue : inks.red,
        ink2: onRed ? inks.blue : onBlue ? inks['on-blue'] : (scheme.matches ? inks.text : inks.blue),
        faint: onBlue || scheme.matches ? 'rgba(236,229,216,.16)' : 'rgba(34,48,90,.12)',
      };
    };
    const render = (t, dt) => { const { ctx, w, h } = fit(canvas); ctx.clearRect(0, 0, w, h); conf.draw(ctx, w, h, t, act || t < until, colors(), dt, st); };
    render(0, 0);
    new ResizeObserver(() => render(performance.now() / 1000, 0)).observe(canvas);
    onScheme.push(() => render(0, 0));
    if (reduce) return;
    if (opts.auto) { act = true; loop(canvas, (t, dt) => render(t, dt)); return; }
    let raf = 0, last = 0;
    const step = (now) => {
      const t = now / 1000, dt = Math.min(.033, t - last || .016); last = t;
      render(t, dt);
      raf = act || t < until ? requestAnimationFrame(step) : 0;
    };
    const start = () => { act = true; if (!raf) { last = performance.now() / 1000; raf = requestAnimationFrame(step); } };
    const stop = () => { if (!act) return; act = false; until = performance.now() / 1000 + 1.2; };
    host.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') start(); });
    host.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') stop(); });
    host.addEventListener('focus', start); host.addEventListener('blur', stop);
    if (!matchMedia('(hover: hover)').matches) { // touch: play while mostly on screen
      new IntersectionObserver((es) => { es[0].isIntersecting ? start() : stop(); }, { threshold: .7 }).observe(host);
    }
  }

  return { COVERS, attach, fit, loop, rng, inks, scheme, onScheme, reduce, TAU };
})();
