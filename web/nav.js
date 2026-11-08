/* PsychoPilot — going back, shared by every page.
   1. Each page remembers how far down the reader was (per tab, in sessionStorage). The back
      button returns to that spot: when the page it leads to is the one the reader came from,
      it steps back in history; otherwise it opens the page and scrolls to the remembered place.
   2. Once the top bar has scrolled away, a floating back button stays in the bottom-left corner,
      opposite the back-to-top button. It does not move. */
(() => {
  'use strict';
  const KEY = 'pp.scroll', FLAG = 'pp.restore';
  const keyOf = (u) => { const url = new URL(u, location.href); let p = url.pathname; if (p.endsWith('/')) p += 'index.html'; return p + url.search; };
  const here = keyOf(location.href);
  const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = () => { try { const m = read(); m[here] = Math.round(scrollY); sessionStorage.setItem(KEY, JSON.stringify(m)); } catch {} };
  addEventListener('pagehide', save);
  document.addEventListener('click', (e) => { if (e.target.closest?.('a[href]')) save(); }, true); // pagehide can come late on phones

  /* ---------- arriving through a back button: scroll to the remembered spot ---------- */
  let want = null;
  try { if (sessionStorage.getItem(FLAG) === here) { want = read()[here] ?? null; sessionStorage.removeItem(FLAG); } } catch {}
  if (want !== null) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    let touched = false;
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((t) => addEventListener(t, () => { touched = true; }, { once: true, passive: true }));
    // fonts, covers and lesson text can still change the page height, so the jump is repeated until the reader takes over
    const go = () => { if (!touched) scrollTo({ top: want, behavior: 'instant' }); };
    go(); requestAnimationFrame(go); addEventListener('load', go); document.fonts?.ready.then(go); setTimeout(go, 400); setTimeout(go, 1200);
  }
  addEventListener('pageshow', (e) => { if (e.persisted) try { if (sessionStorage.getItem(FLAG) === here) sessionStorage.removeItem(FLAG); } catch {} });

  const back = document.querySelector('.mast .back');
  if (!back) return;
  const goBack = (e) => {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let new-tab clicks through
    const target = keyOf(back.href);
    save();
    let from = '';
    try { if (document.referrer && new URL(document.referrer).origin === location.origin) from = keyOf(document.referrer); } catch {}
    try { sessionStorage.setItem(FLAG, target); } catch {}
    if (from === target && history.length > 1) { e.preventDefault(); history.back(); }
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
