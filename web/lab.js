/* PsychoPilot — simulation demos for the method lessons (Stage 02).
   window.PPLab[name](host) fills a <div data-demo="name"> placed in a lesson manuscript.
   Every number shown is generated at random in the browser to illustrate a principle;
   none of it is data from a real study, and each demo says so on screen. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- small helpers ---------- */
  const rnorm = () => { // standard normal (Box–Muller)
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const corr = (xs, ys) => {
    const mx = mean(xs), my = mean(ys);
    let sxy = 0, sxx = 0, syy = 0;
    xs.forEach((x, i) => { const dx = x - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; });
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
  };
  const fmt = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toFixed(d).replace(/^-(0\.?0*)$/, '$1');
  const sign = (x, d = 1) => (x > 0 ? '+' : '') + fmt(x, d);
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (parent) parent.appendChild(e);
    return e;
  };
  // charts are drawn at the figure's real width (1 unit = 1 px), so labels keep their CSS size on phones
  const widthOf = (fig) => Math.round(Math.min(640, Math.max(300, fig.clientWidth || 640)));
  const onResize = (fn) => { let w = 0, t = 0; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (innerWidth !== w) { w = innerWidth; fn(); } }, 150); }); };
  const text = (parent, x, y, s, cls, anchor = 'start') => { const t = el('text', { x, y, class: cls, 'text-anchor': anchor }, parent); t.textContent = s; return t; };

  // shell shared by all demos: heading, "simulated data" notice, control rows, figure, readout
  const shell = (host, title, intro, controls) => {
    host.className = 'l-demo lab';
    host.innerHTML = `
      <div class="l-demo-head">
        <p class="lab">Simulation · 模拟演示</p>
        <h3>${title}</h3>
        <p>${intro}</p>
        <p class="lab-sim">图中的数据都由程序在你的浏览器里随机生成，只用来说明原理，不是任何真实研究的结果。</p>
      </div>
      <div class="lab-ctrls">${controls.map(([key, label, opts]) => `
        <div class="lab-row" role="group" aria-label="${label}">
          <span class="lab-k">${label}</span>
          <div class="lab-opts">${opts.map(([v, t]) => `<button type="button" class="choice" data-k="${key}" data-v="${v}" aria-pressed="false">${t}</button>`).join('')}</div>
        </div>`).join('')}
      </div>
      <div class="lab-actions"></div>
      <div class="lab-fig"></div>
      <div class="lab-out" aria-live="polite"></div>`;
    return { fig: host.querySelector('.lab-fig'), out: host.querySelector('.lab-out'), actions: host.querySelector('.lab-actions') };
  };
  const bindControls = (host, opts, onChange) => {
    const sync = () => host.querySelectorAll('.lab-opts .choice').forEach((b) => b.setAttribute('aria-pressed', String(String(opts[b.dataset.k]) === b.dataset.v)));
    host.querySelector('.lab-ctrls').addEventListener('click', (e) => {
      const b = e.target.closest('.choice');
      if (!b) return;
      const v = b.dataset.v, cur = opts[b.dataset.k];
      opts[b.dataset.k] = typeof cur === 'number' ? Number(v) : v;
      sync(); onChange(b.dataset.k);
    });
    sync();
  };
  const action = (box, label, fn, cls = '') => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'choice lab-act ' + cls; b.textContent = label;
    b.addEventListener('click', fn);
    box.appendChild(b);
    return b;
  };

  /* =====================================================================
     1. experiment (02-01): does a study technique raise test scores?
        The simulation fixes the true effect, so we can see what else ends up
        inside the observed difference: chance, self-selection, rater expectancy.
     ===================================================================== */
  const TRUE_EFFECT = 4;   // points added by the technique in this simulation
  const MOTIVE = 6;        // points per SD of motivation
  const RATER = 4;         // points a non-blind rater adds to the technique group
  function experiment(host) {
    const o = { assign: 'random', blind: 'yes', n: 40 };
    const { fig, out, actions } = shell(host, '一个“新复习方法”的实验',
      '假设研究者想知道：一种新的复习方法，能不能提高考试成绩？你来决定实验怎样设计，然后看看结果。在这个模拟里，我们事先把新方法的“真实效果”设定为提高 4 分；真实研究中，没有人知道这个答案。',
      [['assign', '怎样分组', [['random', '随机分配'], ['self', '让学生自己选']]],
       ['blind', '评分的人', [['yes', '不知道谁在哪组（盲法）'], ['no', '知道谁在哪组']]],
       ['n', '每组人数', [['10', '10 人'], ['40', '40 人'], ['160', '160 人']]]]);
    let last = null;
    const run = () => {
      const N = o.n * 2;
      const people = Array.from({ length: N }, () => ({ m: rnorm(), e: rnorm() }));
      if (o.assign === 'random') {
        for (let i = N - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [people[i], people[j]] = [people[j], people[i]]; }
      } else {
        // more motivated students are more likely to volunteer for the new method
        people.forEach((p) => { p.pick = p.m + rnorm() * 0.8; });
        people.sort((a, b) => b.pick - a.pick);
      }
      const T = people.slice(0, o.n), C = people.slice(o.n);
      const score = (p, treated) => 62 + MOTIVE * p.m + 8 * p.e + (treated ? TRUE_EFFECT + (o.blind === 'no' ? RATER : 0) : 0);
      const ts = T.map((p) => score(p, true)), cs = C.map((p) => score(p, false));
      const diff = mean(ts) - mean(cs);
      const sel = MOTIVE * (mean(T.map((p) => p.m)) - mean(C.map((p) => p.m)));
      const rater = o.blind === 'no' ? RATER : 0;
      last = { ts, cs, diff, sel, rater, chance: diff - TRUE_EFFECT - sel - rater };
      draw();
    };
    const draw = () => {
      const { ts, cs, diff, sel, rater, chance } = last;
      const W = widthOf(fig), H = 210, x = (v) => 40 + ((Math.min(Math.max(v, 20), 100) - 20) / 80) * (W - 60);
      fig.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `模拟结果：新方法组平均比对照组高 ${fmt(diff)} 分` }, fig);
      [[cs, 60, 'a', '对照组'], [ts, 140, 'b', '新方法组']].forEach(([arr, y, c, lab]) => {
        text(svg, 40, y - 34, lab, 'lab-t ' + c);
        arr.forEach((v) => el('circle', { cx: x(v), cy: y + (Math.random() - 0.5) * 30, r: o.n > 100 ? 3 : 4.5, class: 'lab-dot ' + c }, svg));
        const m = mean(arr);
        el('line', { x1: x(m), x2: x(m), y1: y - 24, y2: y + 24, class: 'lab-mean ' + c }, svg);
        text(svg, x(m) + 6, y - 22, '平均 ' + fmt(m), 'lab-s ' + c);
      });
      el('line', { x1: 40, x2: W - 20, y1: H - 22, y2: H - 22, class: 'lab-axis' }, svg);
      [20, 40, 60, 80, 100].forEach((v) => text(svg, x(v), H - 4, String(v), 'lab-tick', 'middle'));
      const parts = [['模拟设定的真实效果', TRUE_EFFECT], ['两组学生本身的差异（谁参加了哪组）', sel], ['评分者的期待', rater], ['偶然因素', chance]];
      out.innerHTML = `<p>这一次，新方法组比对照组平均<b>${diff >= 0 ? '高' : '低'} ${fmt(Math.abs(diff))} 分</b>。因为是模拟，我们可以把这个差异拆开看：</p>
        <ul class="lab-parts">${parts.map(([k, v]) => `<li><span>${k}</span><b>${sign(v)} 分</b></li>`).join('')}</ul>
        <p>${note()}</p>`;
    };
    const note = () => {
      const tips = [];
      if (o.assign === 'self') tips.push('自己选择新方法的学生往往更有学习动力，两组在实验开始前就不一样了，这部分差异会被误当成方法的效果。随机分配能让这类差异在两组之间大致抵消。');
      if (o.blind === 'no') tips.push('评分的人知道谁用了新方法，打分时可能不自觉地偏向他期待的结果。让评分者不知道分组（盲法），可以去掉这部分偏差。');
      if (o.n <= 10) tips.push('每组只有 10 人时，偶然因素的影响很大，多做几次就会发现结果忽高忽低。');
      if (!tips.length) tips.push('随机分配、盲法评分、足够的人数：这时观察到的差异主要由真实效果和较小的偶然波动组成。多做几次看看，结果会在 4 分附近波动。');
      return tips.join('');
    };
    bindControls(host, o, run);
    action(actions, '重新做一次实验', run);
    run();
    onResize(() => last && draw());
  }

  /* =====================================================================
     2. confound (02-03): ice-cream sales and drownings, both driven by heat.
     ===================================================================== */
  function confound(host) {
    const o = { view: 'all' };
    const { fig, out, actions } = shell(host, '冰淇淋与溺水：第三个变量',
      '下面是某个城市 150 天的模拟记录：每天卖出多少冰淇淋，以及发生了几起溺水事故。在这个模拟里，冰淇淋和溺水之间<b>没有任何直接的因果关系</b>，两者都只受当天气温的影响。',
      [['view', '怎样看数据', [['all', '把所有日子放在一起'], ['split', '按气温分成三组']]]]);
    let d = [];
    const BANDS = [[-99, 15, '凉爽（15 °C 以下）', 'c1'], [15, 25, '温暖（15–25 °C）', 'c2'], [25, 99, '炎热（25 °C 以上）', 'c3']];
    const gen = () => {
      d = Array.from({ length: 150 }, () => {
        const t = 5 + Math.random() * 30;
        return { t, ice: Math.max(5, 20 + 4 * t + rnorm() * 25), sw: Math.max(0, 0.6 + 0.13 * t + rnorm() * 1.4) };
      });
      draw();
    };
    const draw = () => {
      const W = widthOf(fig), H = W < 480 ? 280 : 330, L = 48, B = 40, xm = 200, ym = 8;
      const x = (v) => L + (v / xm) * (W - L - 16), y = (v) => H - B - (Math.min(v, ym) / ym) * (H - B - 14);
      fig.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '模拟数据散点图：横轴为冰淇淋销量，纵轴为溺水事故数' }, fig);
      el('line', { x1: L, x2: W - 16, y1: H - B, y2: H - B, class: 'lab-axis' }, svg);
      el('line', { x1: L, x2: L, y1: 10, y2: H - B, class: 'lab-axis' }, svg);
      text(svg, W - 16, H - 8, '每天卖出的冰淇淋（份）→', 'lab-tick', 'end');
      const yl = text(svg, 16, H - B, '溺水事故（起）→', 'lab-tick');
      yl.setAttribute('transform', `rotate(-90 16 ${H - B})`);
      [0, 50, 100, 150, 200].forEach((v) => text(svg, x(v), H - B + 18, String(v), 'lab-tick', 'middle'));
      [0, 2, 4, 6, 8].forEach((v) => text(svg, L - 8, y(v) + 5, String(v), 'lab-tick', 'end'));
      d.forEach((p) => {
        const band = BANDS.find(([lo, hi]) => p.t >= lo && p.t < hi);
        el('circle', { cx: x(p.ice), cy: y(p.sw), r: 5, class: 'lab-dot ' + (o.view === 'split' ? band[3] : 'n') }, svg);
      });
      const r = corr(d.map((p) => p.ice), d.map((p) => p.sw));
      if (o.view === 'all') {
        out.innerHTML = `<p>把 150 天放在一起看，冰淇淋卖得越多的日子，溺水事故往往也越多。两者的相关系数 <b>r = ${fmt(r, 2)}</b>（越接近 1，正相关越强）。</p>
          <p>如果只看这张图，很容易得出“冰淇淋导致溺水”的结论。试试按气温分组。</p>`;
      } else {
        const rows = BANDS.map(([lo, hi, lab, c]) => {
          const g = d.filter((p) => p.t >= lo && p.t < hi);
          return `<li><span><i class="lab-key ${c}"></i>${lab}，${g.length} 天</span><b>${g.length > 4 ? 'r = ' + fmt(corr(g.map((p) => p.ice), g.map((p) => p.sw)), 2) : '天数太少'}</b></li>`;
        }).join('');
        out.innerHTML = `<p>全部数据的相关系数仍然是 r = ${fmt(r, 2)}。但在气温相近的日子里比较，冰淇淋销量和溺水事故之间的相关就弱得多，常常接近 0：</p>
          <ul class="lab-parts">${rows}</ul>
          <p>原来的相关，主要来自第三个变量“气温”：天热时，买冰淇淋的人多，去游泳的人也多。每组的天数不多，所以组内的相关会有一些随机波动。</p>`;
      }
    };
    bindControls(host, o, draw);
    action(actions, '换一批模拟数据', gen);
    gen();
    onResize(draw);
  }

  /* =====================================================================
     3. studies (02-04, 02-05): many small studies of the same true effect.
        Each study's estimate (in standard-deviation units) is drawn from its
        sampling distribution; 95% CI = estimate ± 1.96 × SE, SE = √(2/n).
        data-mode="pub" adds a filter that shows only "significant" studies.
     ===================================================================== */
  function studies(host) {
    const pub = host.dataset.mode === 'pub';
    const o = { d: 0.2, n: 20, show: 'all' };
    const ctrls = [['d', '真实效果（模拟设定）', [['0', '没有效果'], ['0.2', '小'], ['0.5', '中等']]],
                   ['n', '每组人数', [['20', '20 人'], ['80', '80 人'], ['320', '320 人']]]];
    if (pub) ctrls.push(['show', '显示哪些研究', [['all', '全部做过的研究'], ['sig', '只显示“显著”的研究']]]);
    const { fig, out, actions } = shell(host, pub ? '如果只有“显著”的结果被发表' : '同一个问题，做很多次研究',
      pub
        ? '设想许多研究团队各自研究同一个问题。每一行代表一项研究：圆点是它估计出的效果，横线是 95% 置信区间。我们先看全部研究，再看如果只有“显著”的研究被发表，读者会看到什么。'
        : '设想许多研究团队用同样的方法研究同一个问题，比如某种训练能不能提高成绩。每一行代表一项研究：圆点是这项研究估计出的效果，横线是它的 95% 置信区间。红色虚线是模拟中设定的真实效果。',
      ctrls);
    let S = [];
    const MAX = 40;
    const add = (k) => {
      const se = Math.sqrt(2 / o.n);
      for (let i = 0; i < k; i++) {
        const est = o.d + rnorm() * se;
        S.push({ est, lo: est - 1.96 * se, hi: est + 1.96 * se, sig: Math.abs(est / se) > 1.96 });
      }
      draw();
    };
    const draw = () => {
      const shown = (o.show === 'sig' ? S.filter((s) => s.sig) : S).slice(-MAX);
      const W = widthOf(fig), rowH = 9, top = 30, H = top + Math.max(shown.length, 6) * rowH + 34;
      const lo = -1, hi = 1.5, x = (v) => 30 + ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * (W - 50);
      fig.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `模拟的 ${shown.length} 项研究的效果估计与置信区间` }, fig);
      el('line', { x1: x(0), x2: x(0), y1: top - 10, y2: H - 28, class: 'lab-zero' }, svg);
      el('line', { x1: x(o.d), x2: x(o.d), y1: top - 10, y2: H - 28, class: 'lab-true' }, svg);
      text(svg, x(0), top - 16, '0：没有效果', 'lab-tick', 'middle');
      if (o.d !== 0) text(svg, x(o.d) + 6, top - 16, '真实效果', 'lab-tick lab-red');
      shown.forEach((s, i) => {
        const yy = top + i * rowH + 4;
        el('line', { x1: x(s.lo), x2: x(s.hi), y1: yy, y2: yy, class: 'lab-ci' + (s.sig ? ' sig' : '') }, svg);
        el('circle', { cx: x(s.est), cy: yy, r: 3, class: 'lab-est' + (s.sig ? ' sig' : '') }, svg);
      });
      el('line', { x1: 30, x2: W - 20, y1: H - 26, y2: H - 26, class: 'lab-axis' }, svg);
      (W < 480 ? [-1, 0, 0.5, 1, 1.5] : [-1, -0.5, 0, 0.5, 1, 1.5]).forEach((v) => text(svg, x(v), H - 8, String(v), 'lab-tick', 'middle'));
      if (!S.length) { out.innerHTML = '<p>点击“做 1 项研究”或“做 20 项研究”开始。</p>'; return; }
      const sig = S.filter((s) => s.sig), avg = mean(S.map((s) => s.est)), avgSig = sig.length ? mean(sig.map((s) => s.est)) : null;
      const cover = S.filter((s) => s.lo <= o.d && o.d <= s.hi).length;
      const lines = [`<p>到目前为止一共做了 <b>${S.length}</b> 项研究，其中 <b>${sig.length}</b> 项结果“显著”（p &lt; .05，红色；也就是置信区间没有碰到 0）。${S.length > MAX ? `图中只画出最近的 ${MAX} 项。` : ''}</p>`];
      lines.push(`<ul class="lab-parts"><li><span>模拟设定的真实效果</span><b>${fmt(o.d, 2)}</b></li><li><span>全部研究的平均估计</span><b>${fmt(avg, 2)}</b></li>${pub ? `<li><span>只看“显著”研究的平均估计</span><b>${avgSig === null ? '还没有' : fmt(avgSig, 2)}</b></li>` : `<li><span>置信区间包含真实效果的研究</span><b>${cover} / ${S.length}</b></li>`}</ul>`);
      lines.push(`<p>${pub ? pubNote(sig, avgSig) : note(sig)}</p>`);
      out.innerHTML = lines.join('');
    };
    const note = (sig) => {
      if (o.d === 0) return '真实效果为 0 时，大约每 20 项研究里仍会有 1 项“显著”，这就是 p &lt; .05 这条标准允许的误报。';
      if (o.n === 20) return '每组只有 20 人时，置信区间很宽，即使效果真实存在，很多研究也得不到“显著”结果。不显著，不等于没有效果。';
      if (o.n === 320 && o.d === 0.2) return '人数很多时，即使效果很小，大多数研究也能达到“显著”。显著只说明结果不太像纯属偶然，并不说明效果大。';
      return '注意每项研究的估计都在真实效果附近上下波动：单独一项研究，可能偏高，也可能偏低。';
    };
    const pubNote = (sig, avgSig) => {
      if (o.show === 'all') return '先多做一些研究，再切换到“只显示‘显著’的研究”，比较两种平均估计。';
      if (!sig.length) return '目前还没有“显著”的研究，读者在期刊上什么也看不到。';
      if (o.d === 0) return '真实效果为 0，但被“发表”出来的全是显著结果。只读期刊的人会以为这个效果真实存在。';
      return avgSig > o.d * 1.3
        ? '只看“显著”的研究，平均估计明显高于真实效果。人数越少，这种夸大越严重：小样本研究只有碰巧估计偏高时才能达到显著。'
        : '在人数较多、效果较大时，大多数研究本来就显著，筛选造成的夸大会小一些。试试把人数改成 20 人。';
    };
    bindControls(host, o, (k) => { if (k !== 'show') S = []; draw(); });
    action(actions, '做 1 项研究', () => add(1));
    action(actions, '做 20 项研究', () => add(20));
    action(actions, '清空', () => { S = []; draw(); }, 'lab-clear');
    draw();
    onResize(draw);
  }

  window.PPLab = { experiment, confound, studies };
})();
