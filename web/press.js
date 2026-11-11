/* PsychoPilot — "Perception Press" homepage prototype.
   Every image is a real psychological phenomenon, printed in two inks. */
(() => {
  'use strict';
  const PP = window.PP;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } } };

  /* ---------- Continue ---------- */
  {
    const last = PP.byId(store.get('pp.last') || '');
    const c = last || PP.courses[0];
    $('#continue').href = PP.courseUrl(c);
    $('#continue-k').textContent = last ? `接着读 · ${c.id} · ${c.index + 1}/${PP.courses.length}` : `从第一讲开始 · ${c.id}`;
    $('#continue-t').textContent = c.title;
  }

  /* ---------- Search ---------- */
  {
    const input = $('#q'), list = $('#results');
    let hits = [], sel = -1;
    const idx = PP.courses.map((c) => ({ c, t: c.title.toLowerCase(), s: c.sub.toLowerCase(), st: c.stage.title.toLowerCase() }));
    const mark = (text, q) => {
      const i = text.toLowerCase().indexOf(q);
      return i < 0 || !q ? esc(text) : esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
    };
    const search = (raw) => {
      const terms = raw.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.length) return [];
      return idx.map((e) => {
        let score = 0;
        for (const t of terms) {
          const s = (e.t.includes(t) ? 3 : 0) + (e.s.includes(t) ? 2 : 0) + (e.st.includes(t) ? 1 : 0) + (e.c.id.startsWith(t) ? 3 : 0);
          if (!s) return null;
          score += s;
        }
        return { c: e.c, score };
      }).filter(Boolean).sort((a, b) => b.score - a.score || a.c.index - b.c.index).slice(0, 8).map((h) => h.c);
    };
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); };
    const render = () => {
      const q = input.value.trim();
      if (!q) return close();
      hits = search(q); sel = hits.length ? 0 : -1;
      const ql = q.toLowerCase().split(/\s+/)[0];
      list.innerHTML = hits.length
        ? hits.map((c, i) => `<li role="none"><a role="option" id="r${i}" href="${PP.courseUrl(c)}" aria-selected="${i === sel}">
            <span class="rid">${c.id}</span><span class="rt">${mark(c.title, ql)}</span>
            <span class="rs">${c.sub ? mark(c.sub, ql) + ' · ' : ''}${esc(c.stage.title)}</span></a></li>`).join('')
        : `<li class="empty">没找到“${esc(q)}”。换个短一点的词试试。</li>`;
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      if (sel >= 0) input.setAttribute('aria-activedescendant', 'r0');
    };
    const move = (d) => {
      if (!hits.length) return;
      sel = (sel + d + hits.length) % hits.length;
      list.querySelectorAll('[role=option]').forEach((a, i) => a.setAttribute('aria-selected', String(i === sel)));
      $(`#r${sel}`)?.scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', `r${sel}`);
    };
    input.addEventListener('input', render);
    input.addEventListener('focus', () => { if (input.value.trim()) render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); location.href = PP.courseUrl(hits[sel]); }
      else if (e.key === 'Escape') { if (!list.hidden) close(); else input.blur(); }
    });
    document.addEventListener('pointerdown', (e) => { if (!(e.target instanceof Element && e.target.closest('.search'))) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !(e.target instanceof Element && e.target.closest('input, textarea'))) { e.preventDefault(); input.focus(); }
    });
  }

  const { fit, loop, rng, inks, scheme, onScheme, reduce, TAU, COVERS } = window.PPInk;

  /* ======================================================================
     1. The Gestalt plate: ink dots that keep re-grouping by one law at a time
     ====================================================================== */
  function initPlate() {
    const box = $('#plate-art'), cv = box.querySelector('canvas');
    const COLS = 14, ROWS = 11, N = COLS * ROWS;
    const R = rng(7);
    const dots = Array.from({ length: N }, (_, i) => ({
      i, x: R(), y: R(), vx: 0, vy: 0, r: 0, vr: 0, tx: .5, ty: .5, tr: 1, red: 0, tred: 0, j: .85 + R() * .3, ph: R() * TAU,
    }));
    const grid = (i) => [(i % COLS + .5) / COLS, (Math.floor(i / COLS) + .5) / ROWS];

    const LAWS = [
      { zh: '接近律', en: 'Proximity', d: '靠得近的，就是一伙。边框是你的大脑画上去的。',
        set(d, i) {
          const g = i % 6, k = Math.floor(i / 6), cx = [.2, .5, .8][g % 3], cy = [.3, .72][Math.floor(g / 3)];
          const side = 5, a = (k % side) - (side - 1) / 2, b = Math.floor(k / side) - 2.2;
          d.tx = cx + a * .03; d.ty = cy + b * .036; d.tr = k < 26 ? 1 : 0; d.tred = 0;
        } },
      { zh: '相似律', en: 'Similarity', d: '同一个方阵，只换了颜色：行，就变成了列。',
        set(d, i) { const [x, y] = grid(i); d.tx = .06 + x * .88; d.ty = .06 + y * .88; d.tr = 1; d.tred = (i % COLS) % 2 === 0 ? 1 : 0; } },
      { zh: '闭合律', en: 'Closure', d: '圆缺了三段，你看到的仍是一个圆。缺口，大脑替你补上了。',
        set(d, i) {
          const n = 84;
          if (i < n) {
            const a = (i / n) * TAU, gap = [0, TAU / 3, 2 * TAU / 3].some((g) => Math.abs(((a - g + TAU + Math.PI) % TAU) - Math.PI) < .32);
            d.tx = .5 + .36 * Math.cos(a) * .8; d.ty = .5 + .36 * Math.sin(a); d.tr = gap ? 0 : 1.15;
          } else { d.tx = .5; d.ty = .5; d.tr = 0; }
          d.tred = 0;
        } },
      { zh: '连续律', en: 'Continuity', d: '两条点线交叉而过。你认定它们各走各路，而不是在交点折返。',
        set(d, i) {
          const n = 64;
          if (i < 2 * n) {
            const k = i % n, f = k / (n - 1), s = i < n ? 1 : -1;
            d.tx = .06 + f * .88; d.ty = .5 + s * .3 * Math.sin((f - .5) * Math.PI * 1.05); d.tr = .95; d.tred = i < n ? 0 : 1;
          } else { d.tx = .5; d.ty = .5; d.tr = 0; d.tred = 0; }
        } },
      { zh: '共同命运', en: 'Common fate', d: '一起动的，就是一伙。把指针移进来试试。',
        set(d, i) { const [x, y] = grid(i); d.tx = .06 + x * .88; d.ty = .06 + y * .88; d.tr = 1; const c = i % COLS, r = Math.floor(i / COLS); d.tred = 0; d.fate = Math.abs(c - r - 1) <= 1 ? 1 : 0; } },
    ];
    let law = -1, lastSwitch = 0, pausedUntil = 0, ptr = null;
    const cap = { h: $('#law-h'), d: $('#law-d'), btns: [...document.querySelectorAll('#laws button')] };
    function setLaw(k, t) {
      law = k; lastSwitch = t;
      dots.forEach((d, i) => { d.fate = 0; LAWS[k].set(d, i); });
      cap.h.innerHTML = `${LAWS[k].zh}<small>${LAWS[k].en}</small>`;
      cap.d.textContent = LAWS[k].d;
      cap.btns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === k)));
    }
    cap.btns.forEach((b, i) => b.addEventListener('click', () => { setLaw(i, performance.now() / 1000); pausedUntil = performance.now() / 1000 + 20; if (reduce) settle(); }));
    box.addEventListener('pointermove', (e) => { const r = box.getBoundingClientRect(); ptr = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; });
    box.addEventListener('pointerleave', () => { ptr = null; });

    function draw(t) {
      const { ctx, w, h } = fit(cv);
      ctx.clearRect(0, 0, w, h);
      const base = Math.min(w, h) * .0115;
      for (const pass of [0, 1]) { // paper ink first, then red ink (slightly off-register, like a second print run)
        ctx.fillStyle = pass ? inks.red : inks['on-blue'];
        const ox = pass ? 1.2 : 0, oy = pass ? -.8 : 0;
        ctx.beginPath();
        for (const d of dots) {
          const red = d.red > .5;
          if (red !== !!pass || d.r < .02) continue;
          const rr = base * d.r * d.j;
          ctx.moveTo(d.x * w + ox + rr, d.y * h + oy);
          ctx.arc(d.x * w + ox, d.y * h + oy, rr, 0, TAU);
        }
        ctx.fill();
      }
    }
    function settle() { dots.forEach((d) => { d.x = d.tx; d.y = d.ty; d.r = d.tr; d.red = d.tred; }); draw(0); }

    setLaw(0, 0);
    if (reduce) { settle(); onScheme.push(() => draw(0)); return; }
    onScheme.push(() => draw(0));
    loop(box, (t, dt) => {
      if (law < 0 || (t - lastSwitch > 7.5 && t > pausedUntil)) setLaw((law + 1) % LAWS.length, t);
      for (const d of dots) {
        let tx = d.tx, ty = d.ty;
        if (d.fate) ty += .035 * Math.sin(t * 2.4);                       // common fate: move together
        if (ptr) {                                                          // pointer: nearby dots share a fate too
          const dx = d.x - ptr[0], dy = d.y - ptr[1], dist = Math.hypot(dx, dy);
          if (dist < .14) { tx += .025 * Math.sin(t * 3); ty += .025 * Math.cos(t * 3); }
        }
        d.vx += ((tx - d.x) * 34 - d.vx * 8.5) * dt; d.x += d.vx * dt;
        d.vy += ((ty - d.y) * 34 - d.vy * 8.5) * dt; d.y += d.vy * dt;
        d.vr += ((d.tr - d.r) * 60 - d.vr * 9) * dt; d.r += d.vr * dt;
        d.red += (d.tred - d.red) * Math.min(1, dt * 5);
      }
      draw(t);
    });
  }

  /* ======================================================================
     2. Six volumes
     ====================================================================== */
  function initShelf() {
    const ul = $('#shelf');
    ul.innerHTML = PP.parts.map((p) => {
      const cv = COVERS[p.id];
      return `<li>
        <a class="cover${cv.bg === 'paper' ? '' : ' on-' + cv.bg}" href="${PP.partUrl(p)}" data-p="${p.id}" aria-label="第 ${p.numeral} 卷：${esc(p.title)}，${p.courseCount} 门课">
          <span class="top"><span>PsychoPilot</span><span>${p.courseCount} 讲</span></span>
          <span class="vol">${p.numeral}</span>
          <canvas aria-hidden="true"></canvas>
          <h3>${esc(p.short)}</h3>
          <span class="fig">${cv.fig}</span>
        </a>
        <p class="meta"><b>${p.stages.map((s) => s.id).join(' ')}</b>${esc(p.title)}</p>
      </li>`;
    }).join('');
    ul.querySelectorAll('.cover').forEach((a) => window.PPInk.attach(a, a.querySelector('canvas'), +a.dataset.p));
  }

  /* ======================================================================
     3. Albers: the same grey on two grounds
     ====================================================================== */
  function initAlbers() {
    const box = $('#albers'), ans = $('#answer'), btns = [...document.querySelectorAll('.choice')];
    btns.forEach((b) => b.addEventListener('click', () => {
      const open = !box.classList.contains('is-revealed');
      box.classList.toggle('is-revealed', open);
      btns.forEach((x) => x.setAttribute('aria-pressed', String(open && x === b)));
      ans.innerHTML = open
        ? `${b.dataset.a === 'same' ? '对，' : '被骗了：'}两个小方块是<b>同一种颜色</b>，中间那条色带就是证据。周围的颜色，总在改写它。<br><a href="course.html?id=04-02">04-02 视觉错觉与知觉建构 →</a>`
        : '';
    }));
  }

  initPlate();
  initShelf();
  initAlbers();

  /* ---------- Interests ---------- */
  $('#links').innerHTML = PP.topics.map((t) => `<a href="${PP.topicUrl(t)}">${esc(t.label)}</a>`).join('<span class="sep">/</span>');
})();
