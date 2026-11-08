/* PsychoPilot — back-to-top button, shared by every page.
   Appears once the reader is past the first screen and stays until they are back near the top.
   Tap: return to the top. Press and hold for 0.2 s: a reminder that it can be moved, then drag it
   anywhere; the spot is remembered (per device) across pages. */
(() => {
  'use strict';
  const SHOW_AT = () => Math.max(480, innerHeight * 0.9); // appears after roughly one screen
  const HIDE_AT = 80;                                      // and only leaves once back at the top
  const HOLD = 200;                                        // ms of pressing before it becomes movable
  const KEY = 'pp.top.pos';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'to-top';
  btn.setAttribute('aria-label', '回到顶部');
  btn.title = '回到顶部（按住可以拖动）';
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 19V6M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(btn);

  /* ---------- show / hide ---------- */
  let shown = false;
  const setShown = (v) => {
    if (v === shown) return;
    shown = v;
    btn.classList.toggle('is-on', v);
    btn.tabIndex = v ? 0 : -1;
    btn.setAttribute('aria-hidden', String(!v));
  };
  const onScroll = () => {
    const y = scrollY;
    if (!shown && y > SHOW_AT()) setShown(true);
    else if (shown && y < HIDE_AT) setShown(false);
  };
  setShown(true); setShown(false);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- position (remembered as a fraction of the viewport) ---------- */
  const size = () => btn.offsetWidth || 52;
  // visible area, excluding the scrollbar
  const vw = () => document.documentElement.clientWidth || innerWidth;
  const vh = () => document.documentElement.clientHeight || innerHeight;
  const clamp = (x, y) => {
    const m = 12, s = size();
    return [Math.min(Math.max(x, m), vw() - s - m), Math.min(Math.max(y, m), vh() - s - m)];
  };
  let pos = null; // [fx, fy] or null for the default corner
  try { const p = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(p)) pos = p; } catch {}
  const place = () => {
    if (!pos) { btn.style.left = btn.style.top = ''; return; }
    const [x, y] = clamp(pos[0] * vw(), pos[1] * vh());
    btn.style.left = x + 'px'; btn.style.top = y + 'px';
    btn.style.right = btn.style.bottom = 'auto';
  };
  place();
  addEventListener('resize', place);

  /* ---------- tap, hold, drag ---------- */
  let timer = 0, held = false, dragging = false, start = null, grab = null, pid = null;
  const goTop = (byKey) => {
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    // the button hides at the top, so keyboard focus moves to the first link of the page
    if (byKey) document.querySelector('.mast a')?.focus({ preventScroll: true }); else btn.blur();
  };
  const remind = () => {
    btn.classList.remove('is-remind');
    void btn.offsetWidth; // restart the animation
    btn.classList.add('is-remind', 'is-held');
    if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(12); // a light buzz on phones that allow it
  };
  btn.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || !shown) return;
    pid = e.pointerId;
    btn.setPointerCapture(pid);
    held = dragging = false;
    start = [e.clientX, e.clientY];
    const r = btn.getBoundingClientRect();
    grab = [e.clientX - r.left, e.clientY - r.top];
    timer = setTimeout(() => { held = true; remind(); }, HOLD);
  });
  btn.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid || !start) return;
    if (!held) { // moving before the hold completes is a normal tap/scroll, not a drag
      if (Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 8) { clearTimeout(timer); start = null; }
      return;
    }
    dragging = true;
    btn.classList.add('is-dragging');
    const [x, y] = clamp(e.clientX - grab[0], e.clientY - grab[1]);
    btn.style.left = x + 'px'; btn.style.top = y + 'px';
    btn.style.right = btn.style.bottom = 'auto';
  });
  const end = (e) => {
    if (e.pointerId !== pid) return;
    clearTimeout(timer);
    if (dragging) {
      const r = btn.getBoundingClientRect();
      pos = [r.left / vw(), r.top / vh()];
      try { localStorage.setItem(KEY, JSON.stringify(pos)); } catch {}
    } else if (start && !held && e.type === 'pointerup') {
      goTop();
    }
    btn.classList.remove('is-dragging', 'is-held');
    start = null; pid = null; held = dragging = false;
  };
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', end);
  btn.addEventListener('animationend', () => btn.classList.remove('is-remind'));
  btn.addEventListener('contextmenu', (e) => e.preventDefault()); // long-press on touch would open a menu
  btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTop(true); } });
})();
