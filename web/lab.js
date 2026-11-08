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
  const shell = (host, title, intro, controls, sim = '图中的数据都由程序在你的浏览器里随机生成，只用来说明原理，不是任何真实研究的结果。', tag = 'Simulation · 模拟演示') => {
    host.className = 'l-demo lab';
    host.innerHTML = `
      <div class="l-demo-head">
        <p class="lab">${tag}</p>
        <h3>${title}</h3>
        <p>${intro}</p>
        <p class="lab-sim">${sim}</p>
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

  /* =====================================================================
     Stage 04 · demonstrations the reader takes part in. Their own answers are
     never sent anywhere and are not a measurement of anything; each demo says so.
     ===================================================================== */
  const TASK = 'Try it · 动手试试';
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');
  const median = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const keyIn = (host, fn) => host.addEventListener('keydown', (e) => { if (e.altKey || e.ctrlKey || e.metaKey) return; if (fn(e.key.toLowerCase())) e.preventDefault(); });

  /* ----- 04-01 · signal detection: a faint bar in visual noise, under three payoff rules ----- */
  const SDT_RULES = {
    neutral: ['两种错误一样糟', { hit: 1, cr: 1, miss: -1, fa: -1 }],
    screen: ['漏掉的代价很大', { hit: 1, cr: 1, miss: -4, fa: -1 }],
    strict: ['误报的代价很大', { hit: 1, cr: 1, miss: -1, fa: -4 }],
  };
  const SDT_NOISE = { low: ['噪声少', 0.12, 1.4], high: ['噪声多', 0.2, 0.8] }; // label, SD of cell shading, sensitivity of the simulated observer
  const OUTCOME = { hit: '击中', miss: '漏报', fa: '误报', cr: '正确否定' };
  function sdt(host) {
    const o = { noise: 'low', rule: 'neutral' };
    const { fig, out, actions } = shell(host, '在噪声中找一条淡淡的竖线',
      '每一次，下面的方格里都布满了深浅随机的小格。其中一半的画面，正中间那一列（上下有红色小刻度标出）会稍微深一点，形成一条很淡的竖线；另一半没有。请判断：这一次有没有竖线？可以点按钮，也可以按键盘：F 表示“有”，J 表示“没有”。一组 20 次，每次回答后都会告诉你对不对。',
      [['noise', '噪声', Object.entries(SDT_NOISE).map(([k, [t]]) => [k, t])],
       ['rule', '计分规则', Object.entries(SDT_RULES).map(([k, [t]]) => [k, t])]],
      '这是一个教学演示，不是经过验证的测量。屏幕亮度、对比度、观看距离和疲劳都会改变结果，所以它不能说明你的视力或任何能力。你的回答只保存在这个页面里，刷新就会清空。“模拟观察者”的结果由程序随机生成。', TASK);
    const COLS = 15, ROWS = 9, MID = 7, SIG = 0.17;
    let trials = [], i = 0, tally = null, field = null, fb = '', running = false;
    const history = [];
    const stim = document.createElement('div'); stim.className = 'lab-stim';
    const resp = document.createElement('div'); resp.className = 'lab-resp';
    const status = document.createElement('p'); status.className = 'lab-status'; status.setAttribute('aria-live', 'polite');
    fig.append(stim, resp, status);
    const bYes = action(resp, '有竖线（F）', () => answer(true));
    action(resp, '没有（J）', () => answer(false));
    const makeField = (signal) => {
      const sd = SDT_NOISE[o.noise][1];
      return Array.from({ length: ROWS * COLS }, (_, k) => {
        const c = k % COLS, r = Math.floor(k / COLS);
        const v = 0.36 + sd * rnorm() + (signal && c === MID && r > 0 && r < ROWS - 1 ? SIG : 0);
        return Math.min(0.95, Math.max(0.03, v));
      });
    };
    const drawStim = () => {
      const W = Math.min(widthOf(fig), 420), cs = Math.floor((W - 20) / COLS), H = cs * ROWS + 24, x0 = (W - cs * COLS) / 2, xm = x0 + MID * cs + (cs - 1) / 2;
      stim.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': running ? `第 ${i + 1} 次的画面：随机深浅的方格。` : '随机深浅的方格，尚未开始。' }, stim);
      const cells = field || Array(ROWS * COLS).fill(0.12);
      cells.forEach((v, k) => el('rect', { x: x0 + (k % COLS) * cs, y: 12 + Math.floor(k / COLS) * cs, width: cs - 1, height: cs - 1, class: 'lab-cell', 'fill-opacity': v.toFixed(3) }, svg));
      el('path', { d: `M${xm - 5},1 L${xm},9 L${xm + 5},1 Z`, class: 'lab-red' }, svg);
      el('path', { d: `M${xm - 5},${H - 1} L${xm},${H - 9} L${xm + 5},${H - 1} Z`, class: 'lab-red' }, svg);
    };
    const setStatus = () => {
      resp.hidden = !running;
      status.innerHTML = running ? `第 <b>${i + 1}</b> / ${trials.length} 次${fb ? '　·　' + fb : ''}` : fb;
    };
    const start = () => {
      trials = shuffle([...Array(10).fill(true), ...Array(10).fill(false)]);
      i = 0; tally = { hit: 0, miss: 0, fa: 0, cr: 0, pts: 0 }; running = true; fb = '';
      field = makeField(trials[0]); drawStim(); setStatus(); bYes.focus();
    };
    const answer = (yes) => {
      if (!running) return;
      const sig = trials[i], k = sig ? (yes ? 'hit' : 'miss') : (yes ? 'fa' : 'cr');
      tally[k]++; tally.pts += SDT_RULES[o.rule][1][k];
      fb = `上一次${sig ? '有' : '没有'}竖线，你答“${yes ? '有' : '没有'}”：${OUTCOME[k]}`;
      i++;
      if (i >= trials.length) {
        running = false; field = null;
        history.unshift({ who: '你', o: { ...o }, ...tally });
        fb = '这一组做完了。可以换一种计分规则再做一组，比较两组的击中率和误报率。';
        drawStim(); draw(); setStatus(); actions.querySelector('.lab-act')?.focus();
        return;
      }
      field = makeField(trials[i]); drawStim(); setStatus();
    };
    const simulate = () => { // fixed sensitivity; the criterion is the one that earns the most points under the rule
      const d = SDT_NOISE[o.noise][2], v = SDT_RULES[o.rule][1];
      const beta = (v.cr - v.fa) / (v.hit - v.miss), c = d / 2 + Math.log(beta) / d;
      const t = { hit: 0, miss: 0, fa: 0, cr: 0, pts: 0 };
      for (let n = 0; n < 200; n++) { const sig = n % 2 === 0, x = (sig ? d : 0) + rnorm(), yes = x > c, k = sig ? (yes ? 'hit' : 'miss') : (yes ? 'fa' : 'cr'); t[k]++; t.pts += v[k]; }
      history.unshift({ who: '模拟观察者', o: { ...o }, ...t });
      draw();
    };
    const sdtNote = () => {
      const r = history.find((h) => h.o.rule !== 'neutral'), n = history.find((h) => h.o.rule === 'neutral');
      if (!r || !n) return '提示：保持噪声不变，分别在“两种错误一样糟”和“漏掉的代价很大”两种规则下各做一组，再比较。';
      return '比较不同计分规则下的结果：通常，漏掉的代价变大时，击中率和误报率会<b>一起</b>上升；误报的代价变大时，两者会一起下降。画面本身没有变，变的是“多像才算有”的标准。人只做 20 次，偶然波动很大，结果不一定这么整齐。';
    };
    const draw = () => {
      if (history.length > 8) history.length = 8;
      const last = history[0];
      const table = last ? `<p>最近一组（${last.who}，${SDT_NOISE[last.o.noise][0]}，${SDT_RULES[last.o.rule][0]}）：</p>
        <div class="l-table lab-tally" role="region" tabindex="0" aria-label="最近一组的四种结果"><table>
          <thead><tr><th></th><th>回答“有”</th><th>回答“没有”</th></tr></thead>
          <tbody><tr><th>有竖线</th><td>击中 <b>${last.hit}</b></td><td>漏报 <b>${last.miss}</b></td></tr>
          <tr><th>没有竖线</th><td>误报 <b>${last.fa}</b></td><td>正确否定 <b>${last.cr}</b></td></tr></tbody></table></div>` : '';
      const rows = history.map((h) => `<li><span>${h.who} · ${SDT_NOISE[h.o.noise][0]} · ${SDT_RULES[h.o.rule][0]}</span><b>击中率 ${pct(h.hit, h.hit + h.miss)} · 误报率 ${pct(h.fa, h.fa + h.cr)}</b></li>`).join('');
      out.innerHTML = history.length ? `${table}<p>已完成的各组（最新的在最上面）：</p><ul class="lab-parts">${rows}</ul><p>${sdtNote()}</p>` : '<p>还没有结果。点“开始一组”自己做，或者先看看“模拟观察者”在 200 次判断中的表现。</p>';
    };
    keyIn(host, (k) => { if (!running) return false; if (k === 'f') { answer(true); return true; } if (k === 'j') { answer(false); return true; } return false; });
    bindControls(host, o, () => { if (running) { running = false; field = null; fb = '设置改变了，这一组已作废，请重新开始。'; } drawStim(); setStatus(); });
    action(actions, '开始一组（20 次）', start);
    action(actions, '模拟观察者做 200 次', simulate, 'lab-clear');
    action(actions, '清空结果', () => { history.length = 0; running = false; field = null; fb = ''; drawStim(); setStatus(); draw(); }, 'lab-clear');
    drawStim(); setStatus(); draw();
    onResize(drawStim);
  }

  /* ----- 04-02 · Müller-Lyer: set the lower line until it looks as long as the upper one ----- */
  function muller(host) {
    const o = { fins: 'on' };
    const { fig, out, actions } = shell(host, '把两条线调成一样长',
      '上面那条线两端是向外张开的“尾巴”，下面那条两端是“箭头”。拖动滑块（或者选中滑块后按左右方向键），让下面那条线<b>看起来</b>和上面一样长，然后点“我觉得一样长了”。',
      [['fins', '线段两端', [['on', '显示箭头'], ['off', '去掉箭头']]]],
      '这是一个教学演示，不是测量。错觉的强弱因人、屏幕大小和观看条件而不同；有些人几乎感觉不到它，这也很正常。', TASK);
    const sw = document.createElement('div');
    const lab = document.createElement('label'); lab.className = 'lab-range';
    lab.innerHTML = '<span class="lab-k">下面那条线的长度</span><input type="range" min="60" max="150" step="1">';
    const range = lab.querySelector('input');
    fig.append(sw, lab);
    let r = 100, done = false; // r: the lower line as a percentage of the upper one
    const reset = () => { r = Math.random() < 0.5 ? 72 + Math.round(Math.random() * 8) : 130 + Math.round(Math.random() * 8); range.value = r; done = false; draw(); };
    range.addEventListener('input', () => { r = Number(range.value); done = false; draw(); });
    const fins = (svg, x1, x2, y, outward, len) => {
      if (o.fins === 'off') return;
      const a = 0.62, dx = len * Math.cos(a), dy = len * Math.sin(a);
      [[x1, outward ? -1 : 1], [x2, outward ? 1 : -1]].forEach(([x, s]) => [-1, 1].forEach((v) => el('line', { x1: x, y1: y, x2: x + s * dx, y2: y + v * dy, class: 'lab-ml' }, svg)));
    };
    const draw = () => {
      const W = widthOf(fig), H = 196, L = Math.round(W * 0.42), cx = W / 2, f = Math.round(L * 0.16), Lb = Math.round((L * r) / 100);
      sw.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `上面一条线长 ${L} 像素，两端${o.fins === 'on' ? '是向外张开的尾巴' : '没有箭头'}；下面一条线长 ${Lb} 像素${o.fins === 'on' ? '，两端是箭头' : ''}。` }, sw);
      el('line', { x1: cx - L / 2, x2: cx + L / 2, y1: 52, y2: 52, class: 'lab-ml' }, svg); fins(svg, cx - L / 2, cx + L / 2, 52, true, f);
      el('line', { x1: cx - Lb / 2, x2: cx + Lb / 2, y1: 138, y2: 138, class: 'lab-ml' }, svg); fins(svg, cx - Lb / 2, cx + Lb / 2, 138, false, f);
      if (done) {
        [cx - L / 2, cx + L / 2].forEach((x) => el('line', { x1: x, x2: x, y1: 30, y2: 160, class: 'lab-true' }, svg));
        text(svg, cx, 186, '红色虚线标出上面那条线的真实两端', 'lab-s b', 'middle');
      }
      range.setAttribute('aria-valuetext', `上面那条线的 ${r}%`);
      const d = r - 100;
      out.innerHTML = done
        ? `<p>你把下面的线调成了上面的 <b>${r}%</b>，${d === 0 ? '也就是<b>完全一样长</b>' : `也就是比上面${d > 0 ? '长' : '短'}了 <b>${Math.abs(d)}%</b>`}。${o.fins === 'off' ? '去掉箭头之后，判断通常会准确得多。' : d > 2 ? '这正是错觉通常的方向：带箭头的线看起来更短，所以你把它调长了，才觉得两条一样。' : '你的设定几乎没有受到错觉影响，或者偏向了另一边。错觉的强弱本来就因人而异。'}</p><p>${o.fins === 'on' ? '再点“去掉箭头”，看看两条线现在的真实长度。' : '点“重新开始”可以再试一次。'}</p>`
        : '<p>调好之后，点“我觉得一样长了”。</p>';
    };
    bindControls(host, o, draw);
    action(actions, '我觉得一样长了', () => { done = true; draw(); });
    action(actions, '重新开始', () => { o.fins = 'on'; host.querySelectorAll('.lab-opts .choice').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === 'on'))); reset(); }, 'lab-clear');
    reset();
    onResize(draw);
  }

  /* ----- 04-03 · counting Stroop: how many symbols are there, whatever they are ----- */
  const STROOP_K = { neutral: '圆点', same: '一致', diff: '不一致' };
  function stroop(host) {
    const { fig, out, actions } = shell(host, '数一数：一共有几个？',
      '屏幕中间会出现一排符号，有时是圆点，有时是数字。请尽快回答<b>一共有几个</b>，不用管它们是什么。按键盘上的 1、2、3、4，或者点下面的按钮。一组 24 次，大约一分钟。',
      [], '这是一个教学演示，不是测验。浏览器和设备记录的时间并不精确，可能相差几十毫秒；键盘、触屏、屏幕刷新和你当时的状态都会影响结果。结果不能用来判断你的注意力好坏。', TASK);
    host.querySelector('.lab-ctrls').remove();
    const box = document.createElement('div'); box.className = 'lab-stroop';
    const resp = document.createElement('div'); resp.className = 'lab-resp';
    const status = document.createElement('p'); status.className = 'lab-status'; status.setAttribute('aria-live', 'polite');
    fig.append(box, resp, status);
    const btn = [1, 2, 3, 4].map((n) => action(resp, String(n), () => answer(n)));
    let trials = [], i = 0, t0 = 0, live = false, timer = 0, data = [];
    const sym = (t) => Array(t.n).fill(t.kind === 'neutral' ? '●' : String(t.digit)).join(' ');
    const make = () => {
      const list = [];
      ['neutral', 'same', 'diff'].forEach((kind) => [1, 2, 3, 4, 1, 2, 3, 4].forEach((n) => {
        let digit = n;
        if (kind === 'diff') { const alt = [1, 2, 3, 4].filter((x) => x !== n); digit = alt[Math.floor(Math.random() * alt.length)]; }
        list.push({ kind, n, digit });
      }));
      return shuffle(list);
    };
    const running = () => trials.length > 0 && i < trials.length;
    const setStatus = (msg) => { resp.hidden = !running(); status.textContent = msg ?? (running() ? `第 ${i + 1} / ${trials.length} 次` : ''); };
    const showTrial = () => { const t = trials[i]; box.textContent = sym(t); box.setAttribute('aria-label', `第 ${i + 1} 次：${sym(t)}`); t0 = performance.now(); live = true; };
    const showFix = () => { live = false; box.textContent = '+'; box.setAttribute('aria-label', '准备'); timer = setTimeout(showTrial, 600); };
    const start = () => { clearTimeout(timer); trials = make(); i = 0; data = []; setStatus(); draw(); btn[0].focus(); showFix(); };
    const answer = (n) => {
      if (!live) return;
      live = false;
      const t = trials[i];
      data.push({ kind: t.kind, ok: n === t.n, rt: performance.now() - t0 });
      i++;
      if (i >= trials.length) { box.textContent = '完成'; box.removeAttribute('aria-label'); setStatus('这一组做完了。'); draw(); actions.querySelector('.lab-act')?.focus(); return; }
      setStatus(n === t.n ? null : `第 ${i + 1} / ${trials.length} 次　·　上一次答错了：一共有 ${t.n} 个`);
      showFix();
    };
    const draw = () => {
      if (!data.length || running()) { out.innerHTML = running() ? '' : '<p>点“开始”。做完一组后，这里会显示三种情况下你的反应时间。</p>'; return; }
      const res = Object.keys(STROOP_K).map((k) => {
        const d = data.filter((x) => x.kind === k), ok = d.filter((x) => x.ok && x.rt > 150 && x.rt < 4000);
        return { k, med: median(ok.map((x) => x.rt)), err: d.filter((x) => !x.ok).length };
      });
      const W = widthOf(out), H = 156, L = 76, max = Math.max(900, ...res.map((x) => x.med || 0)) * 1.12;
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': res.map((x) => `${STROOP_K[x.k]}：中位反应时间 ${Number.isFinite(x.med) ? Math.round(x.med) + ' 毫秒' : '无'}，答错 ${x.err} 次`).join('；') });
      res.forEach((x, j) => {
        const y = 16 + j * 40, bw = Number.isFinite(x.med) ? (x.med / max) * (W - L - 84) : 0;
        text(svg, L - 10, y + 16, STROOP_K[x.k], 'lab-s', 'end');
        el('rect', { x: L, y, width: Math.max(0, bw), height: 22, class: x.k === 'diff' ? 'lab-bar b' : 'lab-bar' }, svg);
        text(svg, L + bw + 6, y + 16, Number.isFinite(x.med) ? `${Math.round(x.med)} 毫秒` : '—', 'lab-s');
      });
      text(svg, L, H - 6, '中位反应时间，只算答对的', 'lab-tick');
      const gap = res[2].med - res[1].med;
      out.innerHTML = `<p>${Number.isFinite(gap) ? `“不一致”比“一致”${gap >= 0 ? '慢' : '快'}了大约 <b>${Math.abs(Math.round(gap))} 毫秒</b>。` : ''}答错：圆点 ${res[0].err} 次，一致 ${res[1].err} 次，不一致 ${res[2].err} 次。</p>
        <p>${gap > 30 ? '这是一种斯特鲁普式的干扰：任务只要求数个数，可是认出数字是一个更自动的过程。两者冲突时，需要额外的时间压住那个不该给的答案。' : '这一次差异不明显。每种情况只有 8 次，偶然波动很大；设备的计时误差也可能掩盖几十毫秒的差别。研究中通常每人要做许多次，再比较一群人的平均结果。'}</p>`;
      out.prepend(svg);
    };
    keyIn(host, (k) => { if (!running() || !/^[1-4]$/.test(k)) return false; answer(Number(k)); return true; });
    action(actions, '开始（24 次）', start);
    action(actions, '重置', () => { clearTimeout(timer); trials = []; i = 0; data = []; live = false; box.textContent = ''; box.removeAttribute('aria-label'); setStatus(); draw(); }, 'lab-clear');
    setStatus(); draw();
    onResize(() => { if (!running()) draw(); });
  }

  /* ----- 04-03 · change detection: one switch per click, with or without a blank in between ----- */
  const SHAPES = { circle: '圆形', square: '方形', tri: '三角形', ring: '圆环', cross: '十字' };
  const shapeSvg = (s, ink) => {
    const c = ink === 'r' ? 'lab-sh r' : 'lab-sh';
    switch (s) {
      case 'circle': return `<circle cx="20" cy="20" r="12" class="${c}"/>`;
      case 'square': return `<rect x="9" y="9" width="22" height="22" class="${c}"/>`;
      case 'tri': return `<path d="M20 7 L33 31 H7 Z" class="${c}"/>`;
      case 'ring': return `<circle cx="20" cy="20" r="10" class="${c} ring"/>`;
      case 'cross': return `<path d="M16 7h8v9h9v8h-9v9h-8v-9H7v-8h9z" class="${c}"/>`;
      default: return '';
    }
  };
  function change(host) {
    const o = { gap: 'blank' };
    const { fig, out, actions } = shell(host, '哪里变了？',
      '先看清第一张图，准备好以后点“切换”。图会换成第二张，其中<b>有一个</b>图形变了样子，或者不见了。找到它就点那个位置；看不出来就点“看不出来”。每次切换只在你点按钮时发生一次，画面不会闪烁。',
      [['gap', '切换时', [['blank', '中间有短暂空白'], ['none', '直接切换']]]],
      '这是一个教学演示，不是测验。图形由程序随机生成；屏幕大小和观看距离都会影响难度。你的结果只保存在这个页面里。', TASK);
    const stage = document.createElement('div'); stage.className = 'lab-cd';
    const ctl = document.createElement('div'); ctl.className = 'lab-resp';
    const status = document.createElement('p'); status.className = 'lab-status'; status.setAttribute('aria-live', 'polite');
    fig.append(stage, ctl, status);
    const tally = { blank: [0, 0], none: [0, 0] };
    let A = null, B = null, ch = -1, phase = 'idle', timer = 0;
    const where = (k) => `第 ${Math.floor(k / 4) + 1} 行第 ${(k % 4) + 1} 个`;
    const name = (x) => (x.s ? (x.ink === 'r' ? '红色' : '蓝色') + SHAPES[x.s] : '空');
    const build = () => {
      const ks = Object.keys(SHAPES);
      A = Array.from({ length: 12 }, () => ({ s: ks[Math.floor(Math.random() * ks.length)], ink: Math.random() < 0.5 ? 'b' : 'r' }));
      ch = Math.floor(Math.random() * 12);
      B = A.map((x) => ({ ...x }));
      if (Math.random() < 0.35) B[ch] = { s: '', ink: '' };
      else { const alt = ks.filter((k) => k !== A[ch].s); B[ch] = { s: alt[Math.floor(Math.random() * alt.length)], ink: A[ch].ink }; }
    };
    const gridOf = (scene, { click = false, mark = -1, label = '' } = {}) => {
      const g = document.createElement('div'); g.className = 'lab-grid';
      g.setAttribute('role', 'group'); g.setAttribute('aria-label', label);
      scene.forEach((x, k) => {
        const c = document.createElement(click ? 'button' : 'div');
        c.className = 'lab-cellbtn' + (k === mark ? ' is-mark' : '');
        if (click) { c.type = 'button'; c.setAttribute('aria-label', `${where(k)}：${name(x)}`); c.addEventListener('click', () => pick(k)); }
        else { c.setAttribute('role', 'img'); c.setAttribute('aria-label', `${where(k)}：${name(x)}`); }
        c.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">${shapeSvg(x.s, x.ink)}</svg>`;
        g.appendChild(c);
      });
      return g;
    };
    const blankGrid = () => gridOf(Array(12).fill({ s: '' }), { label: '空白' }); // empty frames: no shapes, nothing flashes
    const buttons = (list) => { ctl.innerHTML = ''; list.forEach(([t, fn, cls]) => action(ctl, t, fn, cls)); };
    const begin = () => {
      clearTimeout(timer); build(); phase = 'A';
      stage.innerHTML = ''; stage.appendChild(gridOf(A, { label: '第一张图' }));
      status.textContent = '第一张图。看清楚以后，点“切换”。';
      buttons([['切换', swap]]); ctl.querySelector('button').focus();
    };
    const swap = () => {
      if (phase !== 'A') return;
      phase = 'gap';
      const toB = () => {
        phase = 'B'; stage.innerHTML = ''; stage.appendChild(gridOf(B, { click: true, label: '第二张图：点你认为变了的位置' }));
        status.textContent = '第二张图。哪个位置变了？';
        buttons([['看不出来', () => pick(-1), 'lab-clear']]);
        stage.querySelector('button').focus();
      };
      if (o.gap === 'blank') { stage.innerHTML = ''; stage.appendChild(blankGrid()); ctl.innerHTML = ''; status.textContent = ''; timer = setTimeout(toB, 300); }
      else toB();
    };
    const pick = (k) => {
      if (phase !== 'B') return;
      phase = 'done';
      const t = tally[o.gap]; t[1]++; if (k === ch) t[0]++;
      const what = B[ch].s ? `${name(A[ch])}变成了${name(B[ch])}` : `${name(A[ch])}不见了`;
      status.innerHTML = (k === ch ? '找到了。' : k < 0 ? '没关系，这正是要演示的现象。' : `不是这里（你点的是${where(k)}）。`) + `变化在<b>${where(ch)}</b>：${what}。下面并排显示两张图，变化的位置用红框标出。`;
      stage.innerHTML = '';
      const pair = document.createElement('div'); pair.className = 'lab-pair';
      [['第一张', A], ['第二张', B]].forEach(([lab, sc]) => {
        const w = document.createElement('div');
        w.innerHTML = `<p class="lab-k">${lab}</p>`;
        w.appendChild(gridOf(sc, { mark: ch, label: lab + '图' }));
        pair.appendChild(w);
      });
      stage.appendChild(pair);
      buttons([['再来一轮', begin]]); ctl.querySelector('button').focus();
      draw();
    };
    const draw = () => {
      const [bh, bn] = tally.blank, [nh, nn] = tally.none;
      out.innerHTML = bn + nn ? `<ul class="lab-parts"><li><span>中间有短暂空白</span><b>找到 ${bh} / ${bn} 次</b></li><li><span>直接切换</span><b>找到 ${nh} / ${nn} 次</b></li></ul>
        <p>${bn && nn ? '研究中的典型结果是：直接切换时，变化的位置会产生一个局部的“跳动”，自动把注意力拉过去，所以变化很容易被发现；插入空白以后，整个画面都在变，这个线索被淹没，人们往往要反复对比才找得到。你的几轮结果不一定完全符合这个规律。' : '提示：在“中间有短暂空白”和“直接切换”两种条件下各做几轮，再比较。'}</p>` : '<p>点“开始”。</p>';
    };
    bindControls(host, o, () => { if (phase === 'B' || phase === 'gap' || phase === 'A') begin(); });
    action(actions, '开始', begin);
    action(actions, '清空结果', () => { tally.blank = [0, 0]; tally.none = [0, 0]; draw(); }, 'lab-clear');
    stage.appendChild(blankGrid());
    status.textContent = '点“开始”，看第一张图。';
    draw();
  }

  /* =====================================================================
     Stage 05 · learning models. Each demo runs a small, stated rule and plots it
     on the same kind of chart (lc below). The numbers come from the rule, not from
     any experiment, and every demo says so on screen.
     ===================================================================== */
  const MODEL = 'Model · 模型演示';
  // shared frame for a learning curve; returns the scales. yTicks: [[value, label], ...]
  const lc = (svg, W, H, { xMax, yMax, xTicks, yTicks, xLab, yLab, L = 40, R = 12, T = 30, B = 40 }) => {
    const X = (v) => L + (v / xMax) * (W - L - R), Y = (v) => H - B - (Math.min(v, yMax) / yMax) * (H - T - B);
    yTicks.forEach(([v]) => { if (v) el('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: 'fx-hair fx-dash' }, svg); });
    el('line', { x1: L, x2: W - R, y1: Y(0), y2: Y(0), class: 'lab-axis' }, svg);
    el('line', { x1: L, x2: L, y1: T - 6, y2: Y(0), class: 'lab-axis' }, svg);
    yTicks.forEach(([v, s]) => text(svg, L - 6, Y(v) + 4, s, 'lab-tick', 'end'));
    xTicks.forEach((v) => text(svg, X(v), H - B + 17, String(v), 'lab-tick', 'middle'));
    text(svg, 0, 13, yLab, 'lab-tick');
    text(svg, W - R, H - 4, xLab, 'lab-tick', 'end');
    return { X, Y, L, R, T, B };
  };
  const line = (svg, pts, cls) => el('path', { d: pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' '), class: cls }, svg);
  const tidy = (n, step) => Math.max(step, Math.ceil(n / step) * step);
  const ticksTo = (max, step) => Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);

  /* 05-01 · pavlov: acquisition, extinction, spontaneous recovery and generalization.
     Rule: the response on a trial is R = E − I (never below 0). Bell + food raises E by
     0.3 × (1 − R); bell alone raises an inhibitory association I by 0.3 × R, so the old
     learning E is kept; a day's rest loses half of I. A test tone evokes R × similarity. */
  function pavlov(host) {
    const { fig, out, actions } = shell(host, '让铃声“学会”预告食物',
      '每点一次按钮，模拟的狗就经历 5 次试验。先让铃声和食物配对，再只给铃声，然后让它休息一天，看看反应怎样变化。你也可以随时换一个音调测试。',
      [],
      '这是一个简化模型：曲线由一条事先写好的学习规则计算出来，不是巴甫洛夫或任何真实实验的数据。真实的反应会有起伏，各个现象的大小也因实验而异。', MODEL);
    const MAXT = 60, NEAR = 0.6, FAR = 0.15;
    let E, I, trials, rests, tests, note;
    const reset = () => { E = 0; I = 0; trials = []; rests = []; tests = []; note = '先点“铃声 + 食物”。在这之前，铃声只是一个普通的声音，狗听到它不会流口水。'; draw(); };
    const R = () => Math.max(0, E - I);
    const block = (kind) => {
      if (trials.length >= MAXT) return;
      for (let k = 0; k < 5; k++) {
        const r = R();
        trials.push({ r, kind });
        if (kind === 'pair') E += 0.3 * (1 - r); else I += 0.3 * r;
      }
      const r = R();
      if (kind === 'pair') {
        note = I > 0.05
          ? '重新配对以后，反应恢复得比第一次学习时快。这说明消退没有抹掉原来的学习。'
          : `每次配对，反应都会增加，但增加的幅度越来越小：铃声越能预告食物，新的配对带来的“意外”就越少（下一讲会讲到这一点）。现在铃声引起的反应是 <b>${fmt(r * 100, 0)}</b>（满分 100）。`;
      } else {
        note = E < 0.05
          ? '铃声还从来没有和食物一起出现过，所以单独给铃声什么也不会发生。'
          : `只给铃声、不给食物，反应逐渐减弱，这叫<b>消退</b>。现在的反应是 <b>${fmt(r * 100, 0)}</b>。不过在这个模型里，原来学到的联结仍然保留着，只是被新学到的“铃声之后没有食物”压住了。试试“休息一天”。`;
      }
      draw();
    };
    const rest = () => {
      if (!trials.length || trials.length >= MAXT) return;
      const before = R();
      I *= 0.5; rests.push(trials.length);
      const after = R();
      note = after - before > 0.03
        ? `休息一天之后，铃声又引起了反应，从 <b>${fmt(before * 100, 0)}</b> 回升到 <b>${fmt(after * 100, 0)}</b>，但没有回到最初的水平。这叫<b>自发恢复</b>：消退学到的东西比原来的学习更容易“过期”。`
        : '还没有经历消退，休息不会改变什么。先“只给铃声”几次，再来休息。';
      draw();
    };
    const test = () => {
      if (!trials.length) { note = '狗还没有学过任何东西，换什么音调都不会引起反应。'; draw(); return; }
      const r = R();
      tests.push({ at: trials.length, near: r * NEAR, far: r * FAR });
      note = `用原来的铃声，反应是 <b>${fmt(r * 100, 0)}</b>；换一个相近的音调，反应是 <b>${fmt(r * NEAR * 100, 0)}</b>；换一个很不一样的音调，只有 <b>${fmt(r * FAR * 100, 0)}</b>。越相似的刺激，引起的反应越强，这叫<b>泛化</b>。如果继续训练，只让原来的铃声跟着食物、相近的音调不跟食物，狗会逐渐学会区分两者，这叫<b>辨别</b>。（这里的测试只是查看，不计入训练。）`;
      draw();
    };
    const draw = () => {
      const W = widthOf(fig), H = 250, n = trials.length, xMax = tidy(n + (tests.length ? 2 : 0), 10);
      fig.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `模型结果：一共 ${n} 次试验，现在铃声引起的反应是 ${fmt(R() * 100, 0)}（满分 100）。` }, fig);
      const { X, Y } = lc(svg, W, H, { xMax, yMax: 1, xTicks: ticksTo(xMax, xMax > 30 ? 20 : 10), yTicks: [[0, '0'], [0.5, '50'], [1, '100']], xLab: '试验次数', yLab: '流口水的反应（模型单位）' });
      rests.forEach((t) => { el('line', { x1: X(t + 0.5), x2: X(t + 0.5), y1: 24, y2: Y(0), class: 'fx-hair' }, svg); text(svg, X(t + 0.5) + 4, 40, '休息', 'lab-tick fx-halo'); });
      if (n) line(svg, trials.map((d, i) => [X(i + 1), Y(d.r)]), 'fx-hair');
      trials.forEach((d, i) => el('circle', { cx: X(i + 1), cy: Y(d.r), r: n > 40 ? 3.5 : 4.5, class: d.kind === 'pair' ? 'fx-dot hi' : 'fx-dot lo' }, svg));
      tests.forEach((t) => [[t.near, '近'], [t.far, '远']].forEach(([v, s]) => {
        const x = X(t.at + 0.5), y = Y(v);
        el('rect', { x: x - 4, y: y - 4, width: 8, height: 8, class: 'lab-red' }, svg);
        text(svg, x + 7, y + 4, s, 'lab-s b');
      }));
      out.innerHTML = `<p class="fx-keys"><span><i class="k lo"></i>铃声 + 食物</span><span><i class="k ho"></i>只有铃声</span><span><i class="k hi"></i>换一个音调测试（近 / 远）</span></p><p>${note}</p>${n >= MAXT ? '<p>已经做了 60 次试验。点“重新开始”可以再做一遍。</p>' : ''}`;
      host.querySelectorAll('.lab-actions .lab-act:not(.lab-clear)').forEach((b) => { b.disabled = n >= MAXT; });
    };
    action(actions, '铃声 + 食物 ×5', () => block('pair'));
    action(actions, '只有铃声 ×5', () => block('ext'));
    action(actions, '休息一天', rest);
    action(actions, '换一个音调测试', test);
    action(actions, '重新开始', reset, 'lab-clear');
    reset();
    onResize(draw);
  }

  /* 05-02 · rw: the Rescorla–Wagner rule, run trial by trial, in a blocking design.
     On each trial every cue present changes by 0.3 × (λ − sum of the present cues). */
  function rw(host) {
    const o = { design: 'block' };
    const D = {
      control: ['对照组', '第一阶段不做训练；第二阶段，铃声和灯光一起出现，后面跟着食物。'],
      block: ['阻断组', '第一阶段，铃声单独出现，后面跟着食物；第二阶段，铃声和灯光一起出现，后面跟着同样的食物。'],
      up: ['阻断组，第二阶段奖励加倍', '和阻断组一样，只是第二阶段的食物变成了两倍。'],
      over: ['过度预期', '第一阶段，铃声和灯光轮流单独出现，各自后面跟着食物；第二阶段，两者一起出现，后面跟着同样多的食物。'],
    };
    const { fig, out, actions } = shell(host, '一步一步看预测误差',
      '选择一种实验设计，然后一次一次地进行试验。每次试验，模型先算出“预测”：在场的线索各自的联结强度之和；再和实际得到的食物比较，得到<b>预测误差</b>。在场的线索按照这个误差调整。最后，单独呈现灯光，看它学到了多少。',
      [['design', '实验设计', [['control', '对照组'], ['block', '阻断组'], ['up', '阻断组 + 奖励加倍'], ['over', '过度预期']]]],
      '这是雷斯科拉–瓦格纳模型的计算演示，学习速度设为 0.3，两种线索同样显眼。数值由公式算出，不是卡明实验或任何真实研究的数据。', MODEL);
    const N1 = 10, N2 = 10, A = 0.3;
    let t, vA, vX, hist, last;
    const reset = () => { t = 0; vA = 0; vX = 0; hist = [{ a: 0, x: 0 }]; last = null; draw(); };
    const step = () => {
      if (t >= N1 + N2) return;
      t += 1;
      const p1 = t <= N1;
      if (p1 && o.design === 'control') { last = { p1, skip: true }; hist.push({ a: vA, x: vX }); return draw(); }
      const lam = !p1 && o.design === 'up' ? 2 : 1;
      const solo = p1 && o.design === 'over' && t % 2 === 0 ? 'x' : 'a'; // over-expectation: the two cues take turns in phase 1
      const pred = !p1 ? vA + vX : solo === 'x' ? vX : vA, err = lam - pred;
      if (!p1 || solo === 'a') vA += A * err;
      if (!p1 || solo === 'x') vX += A * err;
      hist.push({ a: vA, x: vX });
      last = { p1, pred, lam, err, solo };
      draw();
    };
    const run = () => { while (t < N1 + N2) step(); };
    const draw = () => {
      const W = widthOf(fig), H = 260, ym = o.design === 'up' ? 2 : 1;
      fig.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `第 ${t} 次试验后：铃声的联结强度 ${fmt(vA, 2)}，灯光的联结强度 ${fmt(vX, 2)}。` }, fig);
      const { X, Y } = lc(svg, W, H, { xMax: N1 + N2, yMax: ym, xTicks: [0, 5, 10, 15, 20], yTicks: ym === 2 ? [[0, '0'], [1, '1'], [2, '2']] : [[0, '0'], [0.5, '0.5'], [1, '1']], xLab: '试验次数', yLab: '联结强度', T: 52 });
      el('line', { x1: X(N1), x2: X(N1), y1: 30, y2: Y(0), class: 'fx-hair' }, svg);
      text(svg, X(N1 / 2), 36, '第一阶段', 'lab-tick', 'middle'); text(svg, X(N1 + N2 / 2), 36, '第二阶段', 'lab-tick', 'middle');
      line(svg, hist.map((h, i) => [X(i), Y(h.a)]), 'fx-ln fx-lb fx-curve');
      line(svg, hist.map((h, i) => [X(i), Y(h.x)]), 'fx-ln fx-lr fx-curve');
      const e = hist[hist.length - 1];
      el('circle', { cx: X(t), cy: Y(e.a), r: 4.5, class: 'fx-node b' }, svg);
      el('circle', { cx: X(t), cy: Y(e.x), r: 4.5, class: 'fx-node r' }, svg);
      const keys = '<p class="fx-keys"><span><i class="k lo"></i>铃声的联结强度</span><span><i class="k hi"></i>灯光的联结强度</span></p>';
      let msg;
      if (!last) msg = `<p><b>${D[o.design][0]}</b>：${D[o.design][1]}点“进行一次试验”开始。</p>`;
      else if (last.skip) msg = `<p>第 ${t} 次试验（第一阶段）：对照组这一阶段不训练，两种线索都还没有学到任何东西。</p>`;
      else {
        const cues = last.p1 ? (last.solo === 'x' ? '灯光' : '铃声') : '铃声 + 灯光';
        msg = `<p>第 ${t} 次试验（${last.p1 ? '第一' : '第二'}阶段，${cues} → ${last.lam === 2 ? '两倍的' : ''}食物）：预测 <b>${fmt(last.pred, 2)}</b>，实际 <b>${last.lam}</b>，预测误差 <b>${fmt(last.err, 2)}</b>。在场的线索各自${last.err < 0 ? '改变' : '增加'} 0.3 × ${fmt(last.err, 2)} = <b>${fmt(A * last.err, 2)}</b>。</p>`;
      }
      if (t >= N1 + N2) {
        msg += `<p>测试：单独呈现灯光。它的联结强度是 <b>${fmt(vX, 2)}</b>。` + ({
          control: '两种线索一起学，平分了食物能支持的联结强度，灯光学到了不少。',
          block: '灯光和食物一起出现了 10 次，却几乎什么也没学到：铃声已经完全预告了食物，第二阶段几乎没有预测误差可以分配给灯光。这就是<b>阻断</b>。',
          up: '奖励加倍以后，铃声的预测不够用了，出现了新的预测误差，灯光也就学到了东西。决定学习的不是配对的次数，而是意外的大小。',
          over: `第一阶段结束时，灯光的联结强度是 <b>${fmt(hist[N1].x, 2)}</b>。第二阶段，两种线索一起出现，预测之和超过了实际的食物，预测误差是负的，于是两者都<b>减弱</b>了，尽管它们每次仍然和食物一起出现。这就是<b>过度预期</b>效应。`,
        })[o.design] + '</p>';
      }
      out.innerHTML = keys + msg;
      bStep.disabled = bRun.disabled = t >= N1 + N2;
    };
    bindControls(host, o, reset);
    const bStep = action(actions, '进行一次试验', step);
    const bRun = action(actions, '一直做到结束', run);
    action(actions, '重新开始', reset, 'lab-clear');
    reset();
    onResize(draw);
  }

  /* 05-03 · schedules: a cumulative record under five reinforcement rules, then extinction.
     The response patterns are written in by hand to match the textbook descriptions; the
     extinction rule is a simplified "discrimination" account: the simulated animal slows down
     only once its current run of unrewarded responses is longer than any it met in training. */
  function schedules(host) {
    const o = { s: 'vr' };
    const NAME = { crf: '每次都奖励', fr: '固定比率 FR 10', vr: '可变比率 VR 10', fi: '固定间隔 FI 60 秒', vi: '可变间隔 VI 60 秒' };
    const { fig, out, actions } = shell(host, '五种奖励规则下的“累积记录”',
      '模拟一只鸽子在实验箱里啄键 10 分钟，然后停止奖励，再观察 5 分钟。曲线越陡，啄得越快；曲线变平，说明停下来了。红色短线标出每一次奖励。换一种规则后，上一种的曲线会以灰色保留，方便比较。',
      [['s', '奖励规则', Object.entries(NAME)]],
      '这是一个程序模拟：各种规则下的反应模式是按照教科书中描述的典型模式写进程序的，停止奖励后的变化用了一个简化的规则（见下方说明）。曲线不是真实动物的记录，每次运行都会略有不同。', MODEL);
    const TR = 600, EX = 300;
    let cur = null, prev = null;
    const sim = (s) => {
      let n = 0, sinceN = 0, lastR = 0, avail = s === 'vi' ? -Math.log(1 - Math.random()) * 60 : 60, need = s === 'vr' ? 1 + Math.floor(Math.random() * 19) : 10;
      let pause = 0, maxRun = 1, exN = 0;
      const pts = [[0, 0]], rf = [];
      for (let sec = 1; sec <= TR + EX; sec++) {
        const ext = sec > TR, since = sec - lastR;
        let rate = { crf: 0.45, fr: 1.3, vr: 1.2, fi: Math.min(1.2, 1.25 * (since / 60) ** 2), vi: 0.6 }[s];
        if (s === 'fr' && since <= pause) rate = 0;
        if (ext) { const over = sinceN - maxRun; if (over > 0) rate *= Math.exp(-over / (4 + maxRun * 0.6)); }
        if (Math.random() < rate) {
          n += 1; sinceN += 1; if (ext) exN += 1;
          let win = false;
          if (!ext) {
            if (s === 'crf') win = true;
            else if (s === 'fr' || s === 'vr') win = sinceN >= need;
            else win = since >= (s === 'fi' ? 60 : avail);
          }
          if (win) {
            rf.push([sec, n]); maxRun = Math.max(maxRun, sinceN); sinceN = 0; lastR = sec;
            if (s === 'vr') need = 1 + Math.floor(Math.random() * 19);
            if (s === 'vi') avail = -Math.log(1 - Math.random()) * 60;
            if (s === 'fr') pause = 4 + Math.random() * 10;
          }
        }
        if (s === 'crf' && !ext) maxRun = 1;
        pts.push([sec, n]);
      }
      return { s, pts, rf, trainN: pts[TR][1], exN, maxRun };
    };
    const run = (keepPrev) => { if (keepPrev && cur && cur.s !== o.s) prev = cur; cur = sim(o.s); draw(); };
    const draw = () => {
      const W = widthOf(fig), H = 280, top = Math.max(cur.pts[TR + EX][1], prev ? prev.pts[TR + EX][1] : 0), yMax = tidy(top, 200);
      fig.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `模拟结果：${NAME[cur.s]}，训练 10 分钟内啄键 ${cur.trainN} 次，得到 ${cur.rf.length} 次奖励；停止奖励后 5 分钟内又啄了 ${cur.exN} 次。` }, fig);
      const { X, Y } = lc(svg, W, H, { xMax: (TR + EX) / 60, yMax, xTicks: [0, 5, 10, 15], yTicks: ticksTo(yMax, yMax > 800 ? 400 : 200).map((v) => [v, String(v)]), xLab: '时间（分钟）', yLab: '累计啄键次数', L: 44 });
      el('rect', { x: X(TR / 60), y: 24, width: X((TR + EX) / 60) - X(TR / 60), height: Y(0) - 24, class: 'fx-band2' }, svg);
      text(svg, X(TR / 60) + 6, 40, '停止奖励', 'lab-tick fx-halo');
      const path = (r, cls) => line(svg, r.pts.filter((p, i) => i % 2 === 0 || i === r.pts.length - 1).map(([s, v]) => [X(s / 60), Y(v)]), cls);
      if (prev) path(prev, 'fx-ln fx-faint fx-curve');
      path(cur, 'fx-ln fx-curve');
      cur.rf.forEach(([s, v]) => el('line', { x1: X(s / 60), x2: X(s / 60) + 5, y1: Y(v), y2: Y(v) + 7, class: 'fx-ln fx-lr' }, svg));
      const per = cur.rf.length ? cur.trainN / cur.rf.length : 0;
      const tip = {
        crf: '每一次啄键都有奖励。停止奖励后，“没有奖励”与训练时的经验截然不同，反应很快就停了下来。',
        fr: '每啄 10 次得到一次奖励。典型模式是：得到奖励后先停一会儿，然后快速地连续啄键，曲线呈现“停顿—冲刺”的台阶。',
        vr: '平均啄 10 次得到一次奖励，但每次需要多少下无法预知。反应又快又稳，几乎没有停顿。',
        fi: '距离上次奖励满 60 秒后的第一次啄键才有奖励。刚得到奖励时几乎不啄，越接近 60 秒啄得越快，曲线呈“扇贝形”。',
        vi: '平均 60 秒才有一次奖励机会，但具体什么时候无法预知。反应速度中等而平稳，因为任何时刻都可能“有了”。',
      }[cur.s];
      out.innerHTML = `<ul class="lab-parts"><li><span>训练 10 分钟：啄键次数</span><b>${cur.trainN}</b></li><li><span>得到的奖励</span><b>${cur.rf.length} 次</b></li>${per ? `<li><span>平均多少次啄键换来一次奖励</span><b>${fmt(per, 1)}</b></li>` : ''}<li><span>停止奖励后 5 分钟：又啄了</span><b>${cur.exN} 次</b></li></ul>
        <p>${tip}</p>${prev ? `<p>灰色曲线是上一次的规则：${NAME[prev.s]}。</p>` : ''}
        <p>停止奖励后的规则：模拟的鸽子只有在“连续没有奖励的次数”超出训练时经历过的最长一段之后，才会逐渐慢下来。这是对部分强化消退效应的一种简化解释，真实的原因还包括挫折等其他因素。</p>
        <p>比较不同规则时，请注意两点。第一，训练时反应得快（曲线陡），和停止奖励后能坚持多久，是两个不同的指标。第二，这里各种规则之间“停止奖励后又啄了多少次”的高低，取决于模型的设定（比如它按连续没有奖励的<em>次数</em>来判断，参数也是设定的），换一套假设，排序就可能不同。它不能说明哪一种规则在现实中普遍更难消退。</p>`;
    };
    bindControls(host, o, () => run(true));
    action(actions, '再模拟一次', () => run(false));
    action(actions, '清除灰色曲线', () => { prev = null; draw(); }, 'lab-clear');
    run(false);
    onResize(draw);
  }

  /* 05-04 · habit: an illustrative automaticity model for three simulated people.
     Each day the behaviour is done, automaticity A moves a fraction r of the way to that
     person's ceiling; r differs between people and is smaller when the context keeps changing.
     A missed day costs 0.5% of A; each day of a two-week break costs 3%. */
  function habit(host) {
    const o = { ctx: 'stable', gap: 'none' };
    const P = [['较快的人', 0.14, 78], ['中等的人', 0.045, 88], ['较慢的人', 0.018, 95]];
    const DAYS = 150, B0 = 50, B1 = 64;
    const { fig, out, actions } = shell(host, '“自动化程度”怎样随重复增加',
      '三个模拟的人，每天在早餐后做同一件事（比如吃一份水果）。他们学习的速度和最终能达到的水平各不相同。你可以改变情境是否稳定，以及中间有没有中断。',
      [['ctx', '情境', [['stable', '固定：每天早餐后'], ['vary', '经常变化：时间地点不固定']]],
       ['gap', '中断', [['none', '没有中断'], ['miss', '每周漏掉一天'], ['break', '第 50 天起中断两周']]]],
      '这是一个说明原理的简化模型，不是纵向研究的数据。曲线“先快后慢、逐渐趋平”的形状参考了拉莉等人（2010）的描述；三个人的速度、上限、情境和中断的影响，都是为了演示而设定的数字。', MODEL);
    const curve = ([, r0, top], gap = o.gap) => {
      const r = r0 * (o.ctx === 'vary' ? 0.4 : 1);
      let A = 0, hit = null;
      const pts = [[0, 0]];
      for (let d = 1; d <= DAYS; d++) {
        const off = (gap === 'miss' && d % 7 === 4) || (gap === 'break' && d >= B0 && d < B1);
        if (off) A *= gap === 'break' ? 0.97 : 0.995; else A += r * (top - A);
        if (hit === null && A >= 0.95 * top) hit = d;
        pts.push([d, A]);
      }
      return { pts, hit, top };
    };
    const draw = () => {
      const W = widthOf(fig), H = 270;
      fig.innerHTML = '';
      const cs = P.map((p) => curve(p)), base = curve(P[1], 'none').hit;
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `模型结果：${P.map((p, i) => `${p[0]}${cs[i].hit ? `在第 ${cs[i].hit} 天达到自己上限的 95%` : `在 ${DAYS} 天内没有达到自己上限的 95%`}`).join('；')}。` }, fig);
      const { X, Y } = lc(svg, W, H, { xMax: DAYS, yMax: 100, xTicks: [0, 30, 60, 90, 120, 150], yTicks: [[0, '0'], [50, '50'], [100, '100']], xLab: '天数', yLab: '自动化程度（模型单位）' });
      if (o.gap === 'break') { el('rect', { x: X(B0), y: 24, width: X(B1) - X(B0), height: Y(0) - 24, class: 'fx-band2' }, svg); text(svg, X(B1) + 4, 56, '中断', 'lab-tick fx-halo'); }
      el('line', { x1: X(21), x2: X(21), y1: 24, y2: Y(0), class: 'fx-hair fx-dash' }, svg);
      text(svg, X(21) + 4, 40, '“21 天”', 'lab-tick fx-halo');
      const cls = ['fx-ln fx-lr fx-curve', 'fx-ln fx-curve', 'fx-ln fx-lb fx-dash fx-curve'];
      cs.forEach((c, i) => {
        line(svg, c.pts.map(([d, v]) => [X(d), Y(v)]), cls[i]);
        if (c.hit) el('circle', { cx: X(c.hit), cy: Y(c.pts[c.hit][1]), r: 4.5, class: ['fx-node r', 'fx-node', 'fx-node b'][i] }, svg);
      });
      const tips = [];
      tips.push(o.ctx === 'vary' ? '情境经常变化时，同样的重复建立的“情境—行为”联结更弱，三条曲线都上升得更慢。' : '在固定的情境中重复，情境线索和行为之间的联结逐渐加强，行为也越来越不需要刻意去想。');
      if (o.gap === 'miss') tips.push(`在这个模型里，每周固定漏掉一天，三条曲线都上升得更慢${base && cs[1].hit ? `，比如中等的人从第 ${base} 天推迟到第 ${cs[1].hit} 天` : ''}，但并没有“前功尽弃”。这些天数只是模型设定的结果：每漏掉一天就少一次重复，自动化程度还会稍有回落。拉莉等人的研究报告的是另一件事：偶尔错过一次机会，对习惯形成的过程没有实质影响；那项研究没有检验每周固定漏掉一天会怎样，也没有报告类似的天数变化。`);
      if (o.gap === 'break') tips.push('在这个模型里，较长的中断会让自动化程度明显回落；恢复重复后，它会重新上升。真实生活中中断的影响有多大，目前的研究还不足以给出具体数字。');
      out.innerHTML = `<p class="fx-keys"><span><i class="k hi"></i>${P[0][0]}</span><span><i class="k tn"></i>${P[1][0]}</span><span><i class="k dash"></i>${P[2][0]}</span></p>
        <ul class="lab-parts">${P.map((p, i) => `<li><span>${p[0]}：达到自己上限的 95%</span><b>${cs[i].hit ? `第 ${cs[i].hit} 天` : `${DAYS} 天内没有达到`}</b></li>`).join('')}</ul>
        <p>${tips.join('')}</p><p>圆点标出每个人达到自己上限 95% 的那一天。同一套规则下，不同的人需要的时间可以相差好几倍；而且“上限”本身也因人而异。“中等的人”在默认设置下大约需要 66 天，这是有意设定得与拉莉等人报告的中位数相近，便于对照，并不是对那项研究的复现。</p>`;
    };
    bindControls(host, o, draw);
    action(actions, '恢复默认设置', () => { o.ctx = 'stable'; o.gap = 'none'; host.querySelectorAll('.lab-opts .choice').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === o[b.dataset.k]))); draw(); }, 'lab-clear');
    draw();
    onResize(draw);
  }

  window.PPLab = { experiment, confound, studies, sdt, muller, stroop, change, pavlov, rw, schedules, habit };
})();
