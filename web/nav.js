/* PsychoPilot — going back and picking up where you left off, shared by every page.
   1. Each page remembers how far down the reader was (per tab, in sessionStorage). Going back, by the
      page's own back button or the browser's, returns to that spot; so does a reload.
   2. Each lesson also remembers the paragraph the reader had reached (in localStorage, across visits).
      Opening the lesson again returns there, with a short note offering to start from the top.
   3. Once the top bar has scrolled away, a floating back button stays in the bottom-left corner,
      opposite the back-to-top button. It does not move.
   Page addresses are normalised because the host serves course.html as /course and index.html as /. */
(() => {
  'use strict';
  const KEY = 'pp.scroll', FLAG = 'pp.restore', READ = 'pp.read';
  const keyOf = (u) => {
    const url = new URL(u, location.href);
    let p = url.pathname.replace(/\.html$/, '');
    if (p.endsWith('/index')) p = p.slice(0, -5);
    return p + url.search;
  };
  const here = keyOf(location.href);
  const json = (store, k) => { try { return JSON.parse(store.getItem(k)) || {}; } catch { return {}; } };
  const put = (store, k, v) => { try { store.setItem(k, JSON.stringify(v)); } catch {} };

  /* ---------- lesson pages: the paragraph the reader had reached ---------- */
  const lessonId = /\/(course|case)$/.test(location.pathname.replace(/\.html$/, '')) ? new URLSearchParams(location.search).get('id') : null;
  const blocks = () => [...document.querySelectorAll('.l-text > :not(section), .l-text section > *')]; // paragraphs, figures, headings
  let ready = !lessonId; // lesson text loaded (other pages are ready at once)
  let settled = false; // the arrival jump is over, so scrolling now is the reader's own
  const mark = () => { // first block whose bottom is below the top of the window, and how far into it we are
    const bs = blocks();
    const i = bs.findIndex((b) => b.getBoundingClientRect().bottom > 80);
    if (i < 0) return null;
    return { i, dy: Math.round(80 - bs[i].getBoundingClientRect().top), y: Math.round(scrollY), t: Date.now() };
  };
  const yOfMark = (m) => { const b = blocks()[m.i]; return b ? b.getBoundingClientRect().top + scrollY - 80 + m.dy : m.y; };
  const saveRead = () => {
    if (!lessonId || !ready || !settled) return;
    const all = json(localStorage, READ);
    if (scrollY < 200) delete all[lessonId]; else { const m = mark(); if (m) all[lessonId] = m; }
    put(localStorage, READ, all);
  };

  // per tab: the scroll position, plus (on a lesson) the paragraph, so a different window width still lands right
  const save = () => { const m = json(sessionStorage, KEY); const mk = lessonId && ready ? mark() : null; m[here] = mk ? { y: Math.round(scrollY), m: mk } : Math.round(scrollY); put(sessionStorage, KEY, m); saveRead(); };
  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
  document.addEventListener('click', (e) => { if (e.target.closest?.('a[href]')) save(); }, true); // pagehide can come late on phones
  let st = 0;
  addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(saveRead, 400); }, { passive: true });

  /* ---------- arriving: decide where to put the reader ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const navType = performance.getEntriesByType?.('navigation')[0]?.type || 'navigate';
  let flagged = false;
  try { flagged = sessionStorage.getItem(FLAG) === here; if (flagged) sessionStorage.removeItem(FLAG); } catch {}
  const sessionY = json(sessionStorage, KEY)[here]; // a number, or { y, m } on a lesson
  const wantBack = (flagged || navType === 'back_forward' || navType === 'reload') && sessionY != null; // beats a #hash in the address
  const record = lessonId && !wantBack && !location.hash ? json(localStorage, READ)[lessonId] : null;
  // tell transit.js this lesson will jump into the text, so it does not morph the title (which scrolls away)
  if (lessonId && ((wantBack && (typeof sessionY === 'object' ? sessionY.y : sessionY) > 200) || record || location.hash)) document.documentElement.dataset.ppJump = '1';

  let touched = false;
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((t) => addEventListener(t, () => { touched = true; settled = true; }, { once: true, passive: true }));
  const target = () => (wantBack ? (typeof sessionY === 'object' ? yOfMark(sessionY.m) : sessionY) : record ? yOfMark(record) : null);
  const go = () => { const y = target(); if (y != null && !touched) scrollTo({ top: Math.max(0, y), behavior: 'instant' }); };
  // fonts, figures and the lesson text itself can still change the page height, so the jump is repeated until it is stable
  const finish = () => { go(); setTimeout(() => { go(); settled = true; if (record && !touched && scrollY > 200) note(); }, 500); };
  if (target() != null || lessonId) {
    go(); requestAnimationFrame(go); document.fonts?.ready.then(go);
    if (ready) addEventListener('load', finish, { once: true });
  } else settled = true;
  if (!lessonId && document.readyState === 'complete') finish();
  document.addEventListener('pp:lesson-ready', () => { ready = true; if (document.readyState === 'complete') finish(); else addEventListener('load', finish, { once: true }); });
  if (lessonId) setTimeout(() => { settled = true; }, 6000); // lessons without a manuscript never send the event
  // back from the page cache (phones use it far more than desktops): this script does not run again, and
  // with scrollRestoration set to 'manual' some browsers (WebKit on iPhone) show the cached page at the top.
  // Put the reader back where this page was when they left it, unless they have already started scrolling.
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    try { if (sessionStorage.getItem(FLAG) === here) sessionStorage.removeItem(FLAG); } catch {}
    const s = json(sessionStorage, KEY)[here];
    if (s == null) return;
    let moved = false;
    const stop = () => { moved = true; };
    ['wheel', 'touchstart', 'keydown'].forEach((t) => addEventListener(t, stop, { once: true, passive: true }));
    const back = () => {
      if (moved) return;
      const y = typeof s === 'object' ? (s.m ? yOfMark(s.m) : s.y) : s;
      if (Math.abs(scrollY - y) > 2) scrollTo({ top: Math.max(0, y), behavior: 'instant' });
    };
    back(); requestAnimationFrame(back); setTimeout(back, 120); setTimeout(back, 400);
  });

  // a short note after jumping into the middle of a lesson, with a way back to the start
  function note() {
    const n = document.createElement('div');
    n.className = 'resume-note'; n.setAttribute('role', 'status');
    n.innerHTML = '<span>已回到上次读到的位置</span><button type="button">从头读</button>';
    document.body.appendChild(n);
    void n.offsetWidth; n.classList.add('is-on'); // reflow first, so it fades in
    const close = () => { n.classList.remove('is-on'); setTimeout(() => n.remove(), 400); };
    n.querySelector('button').addEventListener('click', () => { scrollTo({ top: 0, behavior: 'instant' }); close(); });
    setTimeout(close, 7000);
  }

  /* ---------- the back button ---------- */
  const back = document.querySelector('.mast .back');
  if (!back) return;
  const goBack = (e) => {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let new-tab clicks through
    const t = keyOf(back.href);
    save();
    let from = '';
    try { if (document.referrer && new URL(document.referrer).origin === location.origin) from = keyOf(document.referrer); } catch {}
    try { sessionStorage.setItem(FLAG, t); } catch {}
    if (from === t && history.length > 1) { e.preventDefault(); history.back(); }
  };
  back.addEventListener('click', goBack);

  /* ---------- the floating back button ---------- */
  const fab = document.createElement('a');
  fab.className = 'to-back';
  fab.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M19 12H6M11.5 5.5 5 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="t"></span>';
  const sync = () => {
    const label = back.textContent.replace('←', '').trim();
    fab.href = back.href;
    fab.querySelector('.t').textContent = label;
    fab.setAttribute('aria-label', '返回：' + label);
  };
  const setShown = (v) => { sync(); fab.classList.toggle('is-on', v); fab.tabIndex = v ? 0 : -1; fab.setAttribute('aria-hidden', String(!v)); };
  fab.addEventListener('click', (e) => { sync(); goBack(e); });
  document.body.appendChild(fab);
  setShown(false);
  // shown exactly while the top bar's own back link is scrolled out of view
  let shown = false;
  const check = () => { const v = back.getBoundingClientRect().bottom < 0; if (v !== shown) { shown = v; setShown(v); } };
  addEventListener('scroll', check, { passive: true });
  addEventListener('resize', check);
  check();
})();
