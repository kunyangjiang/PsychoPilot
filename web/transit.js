/* PsychoPilot — page transitions, shared by every page (loaded in <head>, before the first render).
   Uses the browser's cross-document View Transitions (styles in press.css, "Page transitions"):
   1. The old page fades and drifts away in the direction of travel; the new one settles in from the
      other side. Next/previous lesson: sideways. Into a volume or a lesson: up. Back out: down.
   2. The masthead and the floating buttons stay where they are; only the content moves.
   3. One shared element morphs: a lesson title in a volume's list grows into the lesson's heading,
      and a volume cover grows into the cover at the top of the volume page (and back again).
   4. If the next page is slow to arrive (over 0.3 s), the logo's two circles drift apart and fuse
      again in the middle of the screen until it does.
   Browsers without cross-document View Transitions (Firefox for now) simply change pages; readers
   who ask for reduced motion get no movement at all. */
(() => {
  'use strict';
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const HAND = 'pp.vt'; // names the old page used, handed to the new one

  /* ---------- where a URL sits in the site ---------- */
  const place = (u) => {
    let url; try { url = new URL(u, location.href); } catch { return null; }
    if (url.origin !== location.origin) return null;
    const path = url.pathname.replace(/\.html$/, '');
    const q = url.searchParams;
    if (/\/course$/.test(path)) return { kind: 'course', level: 2, id: q.get('id') || '01-01' };
    if (/\/part$/.test(path)) return { kind: 'part', level: 1, p: q.get('p'), topic: q.get('topic') };
    return { kind: 'home', level: 0 };
  };
  // the transition type: which way the pages move
  const direction = (from, to) => {
    if (!from || !to) return 'pp-fade';
    if (to.level > from.level) return 'pp-down';  // going in: the new page rises from below
    if (to.level < from.level) return 'pp-up';    // going out: it comes down from above
    if (to.kind === 'course') return to.id >= from.id ? 'pp-next' : 'pp-prev'; // ids like 06-01 sort in course order
    if (to.kind === 'part' && from.p && to.p) return +to.p >= +from.p ? 'pp-next' : 'pp-prev';
    return 'pp-fade';
  };

  /* ---------- naming the elements that stay put or morph ---------- */
  const named = [];
  const name = (el, n, inline) => {
    if (!el) return;
    el.style.viewTransitionName = n;
    if (inline) el.style.display = 'inline-block'; // a wrapped inline title can only be captured as one box
    named.push(el);
  };
  const clear = () => { named.splice(0).forEach((el) => { el.style.viewTransitionName = ''; el.style.display = ''; }); };
  const inView = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; };
  const sameCourse = (a, id) => place(a.href)?.id === id;

  // what to name on this page, given the page at the other end of the move
  const nameFor = (other, arriving) => {
    clear();
    const me = place(location.href);
    // a lesson about to jump to the reader's saved paragraph (nav.js sets data-pp-jump): its masthead
    // and title are about to scroll away, so they must not be morph targets
    const jump = arriving && root.dataset.ppJump === '1';
    const mast = document.querySelector('.mast');
    if (!jump && inView(mast)) {
      name(mast, 'pp-mast');
      const logo = mast.querySelector('.logo');
      if (inView(logo)) name(logo, 'pp-logo');
    }
    document.querySelectorAll('.to-top.is-on, .to-back.is-on').forEach((b) => name(b, b.classList.contains('to-top') ? 'pp-top' : 'pp-back'));
    if (!me || !other) return;
    // lesson title: volume list <-> lesson heading
    if (me.kind === 'part' && other.kind === 'course') {
      const a = [...document.querySelectorAll('a.lesson')].find((x) => sameCourse(x, other.id));
      const t = a?.querySelector('.lt');
      if (inView(t)) name(t, 'pp-title', true);
    }
    if (me.kind === 'course' && other.kind === 'part' && !jump) {
      const t = document.getElementById('title');
      if (inView(t)) name(t, 'pp-title');
    }
    // volume cover: shelf or neighbouring-volume cover <-> the volume page's own cover
    if (other.kind === 'part' && other.p && (me.kind === 'home' || me.kind === 'part')) {
      const src = me.kind === 'home'
        ? document.querySelector(`#shelf .cover[data-p="${other.p}"]`)
        : [...document.querySelectorAll('.v-nav a')].find((a) => place(a.href)?.p === other.p)?.querySelector('.cover');
      if (inView(src)) name(src, 'pp-cover');
    }
    if (me.kind === 'part' && me.p && other.kind === 'home') {
      const c = document.querySelector('.v-hero .cover');
      if (inView(c)) name(c, 'pp-cover');
    }
    if (me.kind === 'part' && me.p && other.kind === 'part' && other.p) {
      const c = document.querySelector('.v-hero .cover');
      if (inView(c)) name(c, 'pp-cover');
    }
  };

  /* ---------- leaving: name what is on screen, take the loading mark away ---------- */
  addEventListener('pageswap', (e) => {
    stopWait();
    if (!e.viewTransition) return;
    const to = e.activation?.entry?.url;
    nameFor(to ? place(to) : null);
    // tell the next page which parts were on screen here, so it only holds still what can pair up
    try { sessionStorage.setItem(HAND, JSON.stringify({ t: Date.now(), n: named.map((el) => el.style.viewTransitionName) })); } catch {}
  });

  /* ---------- arriving: choose the direction, name the matching elements ----------
     The move is kept apart from the heavy work, which would otherwise drop frames:
     the old page fades out first (on blank paper); only then may a lesson insert its text (the gate,
     used by lesson.js) and nav.js jump to the saved paragraph; then the new page and the morphs play,
     with the main thread idle. A slow manuscript never holds the page for more than HOLD ms. */
  const HOLD = 700, OUT = 160;
  let openGate;
  const gate = new Promise((r) => { openGate = r; });
  setTimeout(() => openGate(), 1500); // never wait forever
  if (!('onpagereveal' in window)) openGate();
  let lessonIn = false;
  document.addEventListener('pp:lesson-ready', () => { lessonIn = true; });
  window.PPTransit = { gate };
  const frames = (n) => new Promise((r) => { const f = () => (n-- > 0 ? requestAnimationFrame(f) : r()); f(); });

  addEventListener('pagereveal', (e) => {
    const vt = e.viewTransition;
    if (!vt) { openGate(); return; }
    if (reduce()) { vt.skipTransition(); openGate(); return; }
    const from = window.navigation?.activation?.from?.url;
    const there = from ? place(from) : null;
    const me = place(location.href);
    const type = direction(there, me);
    try { vt.types?.add(type); } catch {}
    root.dataset.ppVt = type; // fallback for browsers without transition types
    root.classList.add('pp-vt');
    // the floating buttons decide whether to show on a scroll event, which has not fired yet:
    // settle them now, without their fade, so they are captured where they will stay
    const btns = [...document.querySelectorAll('.to-top, .to-back')];
    btns.forEach((b) => { b.style.transition = 'none'; });
    dispatchEvent(new Event('scroll'));
    nameFor(there, true);
    // anything the old page did not have on screen moves with the page instead of floating over it
    let hand = null;
    try { hand = JSON.parse(sessionStorage.getItem(HAND)); sessionStorage.removeItem(HAND); } catch {}
    if (hand && Date.now() - hand.t < 10000) {
      named.filter((el) => !hand.n.includes(el.style.viewTransitionName)).forEach((el) => { el.style.viewTransitionName = ''; el.style.display = ''; });
    }
    const lesson = me?.kind === 'course' && !!document.querySelector('#lesson') && !lessonIn;
    vt.ready.then(() => {
      // everything but the old page's exit waits
      const held = document.getAnimations().filter((a) => {
        const pe = a.effect?.pseudoElement || '';
        return pe.startsWith('::view-transition') && pe !== '::view-transition-old(root)';
      });
      held.forEach((a) => a.pause());
      const release = () => { if (lessonIn) root.classList.add('pp-held'); held.forEach((a) => a.play()); };
      setTimeout(() => {
        openGate();
        if (!lesson) { frames(2).then(release); return; }
        // a lesson: wait for its text, nav.js's jump, and two quiet frames (or give up after HOLD)
        let done = false;
        const go = () => { if (!done) { done = true; frames(2).then(release); } };
        const t = setTimeout(go, HOLD);
        const ready = () => { clearTimeout(t); if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true }); };
        if (lessonIn) ready(); else document.addEventListener('pp:lesson-ready', ready, { once: true });
      }, OUT);
    }, () => openGate());
    vt.finished.finally(() => { root.classList.remove('pp-vt'); delete root.dataset.ppVt; clear(); btns.forEach((b) => { b.style.transition = ''; }); openGate(); });
  });

  // back from the page cache: nothing left named from the swap
  addEventListener('pageshow', (e) => { if (e.persisted) { clear(); stopWait(); } });

  /* ---------- a slow page: the logo's circles separate and fuse until it arrives ---------- */
  let waitTimer = 0, mark = null;
  const startWait = () => {
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => {
      if (!mark) {
        mark = document.createElement('div');
        mark.className = 'pp-wait';
        mark.setAttribute('role', 'status');
        mark.innerHTML = '<i aria-hidden="true"></i><span>正在打开</span>';
      }
      document.body.appendChild(mark);
      void mark.offsetWidth; mark.classList.add('is-on');
    }, 300);
  };
  function stopWait() { clearTimeout(waitTimer); if (mark) { mark.classList.remove('is-on'); mark.remove(); } }
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.('a[href]');
    if (!a || a.target || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // same page, only a #hash
    startWait();
  });
  addEventListener('popstate', stopWait);
})();
