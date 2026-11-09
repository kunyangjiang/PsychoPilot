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

  /* =====================================================================
     Stage 06 · memory. Four short tasks the reader does in the browser, and one
     illustrative model. Tasks keep results only in the page; none of them is a
     validated test, and each says so on screen.
     ===================================================================== */
  // a timed sequence in a box: items[i] shown for on ms, then a blank of off ms; returns a cancel function
  const present = (box, items, on, off, done) => {
    let k = 0, t = 0, dead = false;
    const next = () => {
      if (dead) return;
      if (k >= items.length) { box.textContent = ''; done(); return; }
      box.textContent = items[k]; k++;
      t = setTimeout(() => { box.textContent = ''; t = setTimeout(next, off); }, on);
    };
    next();
    return () => { dead = true; clearTimeout(t); };
  };
  const recallArea = (label, hint) => {
    const w = document.createElement('label'); w.className = 'lab-recall';
    w.innerHTML = `<span class="lab-k">${label}</span><textarea rows="3" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${hint}"></textarea>`;
    return w;
  };
  const pick = (a, n) => shuffle([...a]).slice(0, n);

  /* 06-01 · serial position: immediate recall versus recall after 30 s of counting backwards */
  const WORDS = ['苹果', '钢琴', '蜡烛', '老虎', '雨伞', '镜子', '火车', '枕头', '剪刀', '地图', '月亮', '铃铛', '西瓜', '帽子', '钥匙', '轮船', '蝴蝶', '台灯', '篮球', '茶壶', '信封', '梯子', '手套', '骆驼', '风筝', '冰箱', '肥皂', '鸽子', '铅笔', '邮票', '窗帘', '面包', '花瓶', '沙发', '斧头', '口哨'];
  const SP_N = 12, SP_DELAY = 30;
  // schematic serial-position shapes (proportion recalled by position), not data from any study
  const spShape = (i, delayed) => 0.3 + 0.32 * Math.exp(-(i - 1) / 1.4) + (delayed ? 0 : 0.5 * Math.exp(-(SP_N - i) / 1.5));
  function serial(host) {
    const o = { when: 'now' };
    const { fig, out, actions } = shell(host, '先记住，再写下来',
      `屏幕上会依次出现 ${SP_N} 个词，每个大约一秒半。看完以后，把你记得的词写下来，顺序不限，可以用空格隔开，也可以连在一起写。“立即回忆”是看完马上写；“30 秒后回忆”是看完先做 30 秒心算（从一个三位数开始，每次减 3，小声数出来），然后再写。`,
      [['when', '什么时候回忆', [['now', '立即回忆'], ['delay', '30 秒后回忆']]]],
      '这是一个教学演示，不是记忆测验。词表很短，每轮只有十几个词，偶然波动很大；你的结果只保存在这个页面里，刷新就会清空。图中的两条曲线是示意形状，不是任何研究的原始数据。', TASK);
    const box = document.createElement('div'); box.className = 'lab-stroop lab-word'; box.setAttribute('aria-live', 'polite');
    const rec = recallArea('你记得的词', '例如：苹果 钢琴 ……');
    const area = rec.querySelector('textarea');
    const ctl = document.createElement('div'); ctl.className = 'lab-resp';
    const status = document.createElement('p'); status.className = 'lab-status'; status.setAttribute('aria-live', 'polite');
    const chart = document.createElement('div');
    fig.append(box, rec, ctl, status, chart);
    const runs = { now: [], delay: [] }; // each run: array of 12 booleans by position
    let list = [], cancel = () => {}, phase = 'idle', clock = 0;
    const setPhase = (p) => { phase = p; rec.hidden = p !== 'recall'; ctl.innerHTML = ''; };
    const stop = () => { cancel(); clearInterval(clock); };
    const begin = () => {
      stop(); list = pick(WORDS, SP_N); area.value = ''; setPhase('show');
      status.textContent = '请注意看。';
      cancel = present(box, list, 1500, 300, () => (o.when === 'delay' ? count() : recall()));
    };
    const count = () => {
      setPhase('count');
      let left = SP_DELAY; const n0 = 300 + Math.floor(Math.random() * 600);
      box.textContent = `${n0} − 3 − 3 …`;
      status.textContent = `从 ${n0} 开始，每次减 3，小声数出来。还剩 ${left} 秒。`;
      clock = setInterval(() => { left--; if (left <= 0) { clearInterval(clock); recall(); } else status.textContent = `从 ${n0} 开始，每次减 3，小声数出来。还剩 ${left} 秒。`; }, 1000);
    };
    const recall = () => {
      setPhase('recall'); box.textContent = '写下你记得的词';
      status.textContent = '写好以后点“完成”。想不起来的不用猜。';
      action(ctl, '完成', score); area.focus();
    };
    const score = () => {
      if (phase !== 'recall') return;
      const said = area.value.replace(/\s+/g, ' ');
      const hit = list.map((w) => said.includes(w));
      runs[o.when].push(hit); setPhase('done');
      box.innerHTML = list.map((w, i) => `<span class="${hit[i] ? 'is-hit' : ''}">${w}</span>`).join('');
      box.classList.add('lab-list');
      status.innerHTML = `这一轮你写对了 <b>${hit.filter(Boolean).length}</b> / ${SP_N} 个。上面按出现的顺序列出全部词，写对的用红色标出。`;
      action(ctl, '再来一轮', () => { box.classList.remove('lab-list'); begin(); });
      ctl.querySelector('button').focus();
      draw();
    };
    const draw = () => {
      const W = widthOf(fig), H = 250;
      chart.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `示意曲线：立即回忆时，开头和结尾的词都容易记住；30 秒后回忆时，结尾的优势消失，开头的优势仍在。${['now', 'delay'].map((k) => runs[k].length ? `你在${k === 'now' ? '立即回忆' : '30 秒后回忆'}中做了 ${runs[k].length} 轮。` : '').join('')}` }, chart);
      const { X, Y } = lc(svg, W, H, { xMax: SP_N + 0.6, yMax: 1, xTicks: [1, 4, 8, 12], yTicks: [[0, '0'], [0.5, '50%'], [1, '100%']], xLab: '词在列表中的位置', yLab: '写对的比例', L: 46 });
      const xs = Array.from({ length: SP_N }, (_, i) => i + 1);
      line(svg, xs.map((i) => [X(i), Y(spShape(i, false))]), 'fx-ln fx-lr fx-curve');
      line(svg, xs.map((i) => [X(i), Y(spShape(i, true))]), 'fx-ln fx-lb fx-dash fx-curve');
      [['now', 'fx-node r'], ['delay', 'fx-dot lo']].forEach(([k, cls]) => {
        const R = runs[k]; if (!R.length) return;
        xs.forEach((i) => el('circle', { cx: X(i), cy: Y(R.filter((r) => r[i - 1]).length / R.length), r: 4.5, class: cls }, svg));
      });
      const n = runs.now.length, d = runs.delay.length;
      const tail = (k) => { const R = runs[k]; let s = 0; R.forEach((r) => { s += r.slice(-3).filter(Boolean).length; }); return R.length ? s / (3 * R.length) : null; };
      const head = (k) => { const R = runs[k]; let s = 0; R.forEach((r) => { s += r.slice(0, 3).filter(Boolean).length; }); return R.length ? s / (3 * R.length) : null; };
      out.innerHTML = `<p class="fx-keys"><span><i class="k hi"></i>立即回忆（示意曲线）</span><span><i class="k dash"></i>30 秒后回忆（示意曲线）</span></p>
        <p class="lab-note">圆点是你自己的结果：实心红点是立即回忆，空心圆圈是 30 秒后回忆。每个位置上的点表示，在你做过的几轮里，这个位置的词被写对的比例。</p>
        ${n + d ? `<ul class="lab-parts lab-flow">${[['now', '立即回忆'], ['delay', '30 秒后回忆']].filter(([k]) => runs[k].length).map(([k, t]) => `<li><span>${t} · ${runs[k].length} 轮</span><b>开头 ${pct(head(k), 1)}｜结尾 ${pct(tail(k), 1)}</b></li>`).join('')}</ul>` : ''}
        <p>${n && d ? '“开头”和“结尾”分别指列表中前 3 个和后 3 个词被写对的比例。经典结果是：先做 30 秒心算，结尾几个词的优势（近因效应）基本消失，而开头几个词的优势（首因效应）几乎不受影响。你只做了几轮，结果不一定这么整齐。' : '提示：两种条件各做一两轮，再比较开头和结尾的词。'}</p>`;
    };
    bindControls(host, o, () => { if (phase !== 'idle' && phase !== 'done') { stop(); setPhase('idle'); box.textContent = ''; status.textContent = '设置改变了，这一轮已作废。点“开始”重新来。'; } });
    action(actions, '开始', () => { box.classList.remove('lab-list'); begin(); });
    action(actions, '清空结果', () => { stop(); runs.now = []; runs.delay = []; setPhase('idle'); box.classList.remove('lab-list'); box.textContent = ''; status.textContent = '点“开始”。'; draw(); }, 'lab-clear');
    setPhase('idle'); status.textContent = '点“开始”。'; draw();
    onResize(draw);
  }

  /* 06-02 · digit span: one digit at a time, or the same digits in groups of three */
  function span(host) {
    const o = { mode: 'one' };
    const { fig, out, actions } = shell(host, '一次能记住几位数字？',
      '屏幕上会依次出现一串数字。数字消失后，按原来的顺序输入它们（用下面的数字键，或者直接用键盘输入，按 Enter 确定）。从 4 位开始；每个长度有两次机会，只要有一次全对，就增加一位；两次都错，这一轮就结束。',
      [['mode', '呈现方式', [['one', '一个一个出现'], ['group', '三个一组出现']]]],
      '这是一个教学演示，不是经过验证的测量。正式的数字广度测验有统一的速度、指导语和常模；这里的屏幕、环境和你的状态都会影响结果。它不能说明你的智力、注意力或记忆力好坏。结果只保存在这个页面里。', TASK);
    const box = document.createElement('div'); box.className = 'lab-stroop'; box.setAttribute('aria-live', 'polite');
    const typed = document.createElement('p'); typed.className = 'lab-typed'; typed.setAttribute('aria-live', 'polite');
    const pad = document.createElement('div'); pad.className = 'lab-pad';
    const status = document.createElement('p'); status.className = 'lab-status'; status.setAttribute('aria-live', 'polite');
    fig.append(box, typed, pad, status);
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '删除', '0', '确定'].map((k) => action(pad, k, () => press(k), k === '确定' ? '' : 'lab-clear'));
    const history = [];
    let len = 4, tries = 0, okAt = 0, best = 0, seq = [], input = '', phase = 'idle', cancel = () => {};
    const setPad = (on) => { pad.hidden = !on; typed.hidden = !on; };
    const make = (n) => { const a = []; while (a.length < n) { const d = Math.floor(Math.random() * 10); if (d !== a[a.length - 1]) a.push(d); } return a; };
    const trial = () => {
      seq = make(len); input = ''; phase = 'show'; setPad(false); box.classList.remove('lab-seq');
      status.textContent = `${len} 位数字，第 ${tries + 1} 次机会。请注意看。`;
      const items = o.mode === 'one' ? seq.map(String) : seq.join('').match(/.{1,3}/g);
      const on = o.mode === 'one' ? 800 : 2400;
      cancel = present(box, items, on, 250, () => { phase = 'type'; box.textContent = '？'; typed.textContent = '　'; setPad(true); status.textContent = '按顺序输入刚才的数字。'; keys[0].focus(); });
    };
    const start = () => { cancel(); len = 4; tries = 0; okAt = 0; best = 0; trial(); };
    const press = (k) => {
      if (phase !== 'type') return;
      if (k === '删除') input = input.slice(0, -1);
      else if (k === '确定') return check();
      else if (input.length < len) input += k;
      typed.textContent = input ? input.split('').join(' ') : '　';
    };
    const check = () => {
      const ok = input === seq.join('');
      tries++; if (ok) { okAt++; best = len; }
      box.textContent = seq.join(' '); box.classList.add('lab-seq');
      if (tries === 2 || (ok && tries === 1)) {
        if (okAt > 0 && len < 14) { len++; tries = 0; okAt = 0; phase = 'wait'; setPad(false); status.textContent = `${ok ? '对了' : '这次没对'}。下一组：${len} 位。`; cancel = present(box, [seq.join(' ')], 1200, 400, trial); return; }
        phase = 'idle'; setPad(false);
        history.unshift({ mode: o.mode, best });
        status.textContent = `${ok ? '对了' : `这次没对，你输入的是 ${input || '（空）'}`}。这一轮结束。`;
        draw(); actions.querySelector('.lab-act')?.focus(); return;
      }
      phase = 'wait'; setPad(false);
      status.textContent = `这次没对，你输入的是 ${input || '（空）'}。同样长度再试一次。`;
      cancel = present(box, [seq.join(' ')], 1200, 400, trial);
    };
    const draw = () => {
      if (history.length > 8) history.length = 8;
      const by = (m) => history.filter((h) => h.mode === m).map((h) => h.best);
      out.innerHTML = history.length ? `<p>已完成的各轮（最新的在最上面）：</p><ul class="lab-parts">${history.map((h) => `<li><span>${h.mode === 'one' ? '一个一个出现' : '三个一组出现'}</span><b>${h.best ? `最长记对 ${h.best} 位` : '4 位没有记对'}</b></li>`).join('')}</ul>
        <p>${by('one').length && by('group').length ? '比较两种方式：很多人觉得三个一组更容易，因为几位数字被组织成一个更大的单位来记。但这里只是把呈现分了组，并没有给数字赋予意义；你的两种结果差多少，因人而异，也会受偶然波动影响。' : '提示：两种呈现方式各做一轮，再比较。'}</p>
        <p>对大多数人来说，这类任务的结果落在五到九位左右，这也是“7±2”这个说法的来源。但这个数字取决于材料、速度和策略：用数字和用字词结果不同，能把材料组块的人记得更多，经过长期训练的人甚至能记住几十位。</p>`
        : '<p>点“开始”。一轮通常需要两三分钟。</p>';
    };
    keyIn(host, (k) => { if (phase !== 'type') return false; if (/^[0-9]$/.test(k)) { press(k); return true; } if (k === 'backspace') { press('删除'); return true; } if (k === 'enter') { press('确定'); return true; } return false; });
    bindControls(host, o, () => { if (phase !== 'idle') { cancel(); phase = 'idle'; setPad(false); box.textContent = ''; status.textContent = '设置改变了，这一轮已作废。点“开始”重新来。'; } });
    action(actions, '开始', start);
    action(actions, '清空结果', () => { cancel(); phase = 'idle'; setPad(false); box.textContent = ''; history.length = 0; status.textContent = ''; draw(); }, 'lab-clear');
    setPad(false); draw();
  }

  /* 06-03 · retrieval cues: free recall first, then the same list again with its category names as cues */
  const CATS = {
    水果: ['葡萄', '樱桃', '香蕉', '菠萝', '柠檬'], 乐器: ['小提琴', '吉他', '二胡', '长笛', '琵琶'], 动物: ['熊猫', '海豚', '狐狸', '刺猬', '企鹅'],
    交通工具: ['地铁', '卡车', '帆船', '飞机', '摩托车'], 天气: ['冰雹', '台风', '浓雾', '雷阵雨', '霜冻'], 厨房用品: ['菜刀', '砧板', '锅铲', '漏勺', '蒸笼'],
    体育运动: ['游泳', '滑雪', '拳击', '射箭', '跳水'], 身体部位: ['肩膀', '膝盖', '眉毛', '手腕', '脚踝'],
  };
  function cue(host) {
    const { fig, out, actions } = shell(host, '想不起来，还是没记住？',
      '屏幕上会依次出现 18 个词，每个大约一秒半，它们分属 6 个类别，但顺序是打乱的。看完以后先把记得的词写下来；写完，屏幕会给出 6 个类别名称，请再写一次，可以把刚才写过的也写上。',
      [], '这是一个教学演示，不是记忆测验。词表很短，结果受偶然波动影响很大；它不能说明你的记忆力好坏。结果只保存在这个页面里，刷新就会清空。', TASK);
    host.querySelector('.lab-ctrls').remove();
    const box = document.createElement('div'); box.className = 'lab-stroop lab-word'; box.setAttribute('aria-live', 'polite');
    const hint = document.createElement('p'); hint.className = 'lab-cues';
    const rec = recallArea('你记得的词', '例如：葡萄 地铁 ……');
    const area = rec.querySelector('textarea');
    const ctl = document.createElement('div'); ctl.className = 'lab-resp';
    const status = document.createElement('p'); status.className = 'lab-status'; status.setAttribute('aria-live', 'polite');
    fig.append(box, hint, rec, ctl, status);
    const rounds = [];
    let items = [], cats = [], free = [], phase = 'idle', cancel = () => {};
    const setPhase = (p) => { phase = p; rec.hidden = p !== 'free' && p !== 'cued'; hint.hidden = p !== 'cued'; ctl.innerHTML = ''; };
    const begin = () => {
      cancel(); box.classList.remove('lab-list');
      cats = pick(Object.keys(CATS), 6);
      items = shuffle(cats.flatMap((c) => pick(CATS[c], 3).map((w) => ({ c, w }))));
      area.value = ''; setPhase('show'); status.textContent = '请注意看。';
      cancel = present(box, items.map((x) => x.w), 1500, 300, () => {
        setPhase('free'); box.textContent = '先不看提示，写下你记得的词';
        status.textContent = '写好以后点“下一步”。'; action(ctl, '下一步', toCued); area.focus();
      });
    };
    const toCued = () => {
      if (phase !== 'free') return;
      const said = area.value; free = items.map((x) => said.includes(x.w));
      area.value = ''; setPhase('cued'); box.textContent = '再写一次，这次有类别提示';
      hint.innerHTML = '这 18 个词分属：' + cats.map((c) => `<b>${c}</b>`).join('　');
      status.textContent = '可以把刚才写过的也写上。写好以后点“完成”。'; action(ctl, '完成', done); area.focus();
    };
    const done = () => {
      if (phase !== 'cued') return;
      const said = area.value, cued = items.map((x, i) => free[i] || said.includes(x.w));
      const nf = free.filter(Boolean).length, nc = cued.filter(Boolean).length;
      rounds.unshift({ nf, nc }); setPhase('done');
      box.classList.add('lab-list');
      box.innerHTML = cats.map((c) => items.map((x, i) => [x, i]).filter(([x]) => x.c === c).map(([x, i]) => `<span class="${free[i] ? 'is-hit' : cued[i] ? 'is-cue' : ''}">${x.w}</span>`).join('')).join('');
      status.innerHTML = `没有提示时写对 <b>${nf}</b> 个；有了类别提示，一共写对 <b>${nc}</b> 个。上面按类别列出全部词：红色是一开始就写出来的，蓝框是看到提示后才想起来的。`;
      action(ctl, '再来一轮', begin); ctl.querySelector('button').focus();
      draw();
    };
    const draw = () => {
      out.innerHTML = rounds.length ? `<ul class="lab-parts lab-flow">${rounds.slice(0, 6).map((r, i) => `<li><span>第 ${rounds.length - i} 轮</span><b>没有提示 ${r.nf} · 有提示 ${r.nc} / 18</b></li>`).join('')}</ul>
        <p>${rounds[0].nc > rounds[0].nf ? `这一轮，有 ${rounds[0].nc - rounds[0].nf} 个词在第一次没有写出来，看到类别名称后却想起来了。它们一直都在记忆里，只是第一次缺少一条通向它们的路。` : '这一轮，类别提示没有帮你多想起词来。如果第一次几乎全写出来了，提示自然没有用武之地；词表很短，偶然波动也很大。'}这种差别，正是心理学家区分“储存了没有”（可用性）和“此刻能不能提取”（可及性）的依据。</p>`
        : '<p>点“开始”。一轮大约需要两分钟。</p>';
    };
    action(actions, '开始', begin);
    action(actions, '清空结果', () => { cancel(); rounds.length = 0; setPhase('idle'); box.classList.remove('lab-list'); box.textContent = ''; status.textContent = ''; draw(); }, 'lab-clear');
    setPhase('idle'); draw();
  }

  /* 06-04 · misinformation: a short story, questions that slip in details it never had, then a memory test */
  const STORY = '周六上午十点左右，街角一家咖啡馆里人不多。靠窗的桌边坐着一位穿灰色外套的女士，她正在用笔记本电脑工作，手边放着一杯拿铁和一部手机。一个穿深蓝色运动衫、背着双肩包的年轻男子走进来，在柜台前排队。轮到他时，他点了一杯美式咖啡，用现金付了钱。等咖啡的时候，他走到窗边看外面的街道，顺手拿起女士桌上的手机，放进运动衫口袋，没有等咖啡就快步走出了门。女士过了大约一分钟才发现手机不见了。店员说，那个男子出门后向左拐，朝公交车站的方向走去。';
  // [item asked about in the final test, misleading question, neutral question]
  const LURES = [
    ['男子戴着一顶帽子', '那名男子把帽子压得很低。你觉得店员能看清他的脸吗？', '那名男子在柜台前点单。你觉得店员能看清他的脸吗？'],
    ['男子进门时带着一把雨伞', '男子进门时把雨伞靠在了门边。他在柜台前大约排了多久？', '男子进门后先去排队。他在柜台前大约排了多久？'],
    ['男子骑自行车离开', '男子出门后骑上了停在门外的自行车。你觉得他是事先计划好的吗？', '男子出门后很快就不见了。你觉得他是事先计划好的吗？'],
    ['女士桌上有一块蛋糕', '女士桌上除了拿铁，还有一块吃了一半的蛋糕。她当时在做什么？', '女士坐在靠窗的桌边。她当时在做什么？'],
  ];
  const TRUE_ITEMS = ['女士穿着灰色外套', '男子背着双肩包', '男子用现金付钱', '女士在喝拿铁'];
  const CONF = ['不太确定', '比较确定', '非常确定'];
  function misinfo(host) {
    const { fig, out, actions } = shell(host, '问题里的一句话，会不会变成你的记忆？',
      '先读一段很短的故事，读完点“读完了”。接着回答几个关于故事的问题，不用写下来，想一想就行。最后是一个记忆测验：对每一条说法，判断<b>故事里</b>有没有提到，并说明你有多确定。',
      [], '这是一个教学演示，不是心理测验。一个人在一段故事上的表现，受阅读速度、注意、措辞和猜测等许多因素影响，不能说明你“容易”或“不容易”受暗示，更不能用来判断任何真实记忆的真假。你的回答只保存在这个页面里。', TASK);
    host.querySelector('.lab-ctrls').remove();
    const stage = document.createElement('div'); stage.className = 'lab-mis';
    const ctl = document.createElement('div'); ctl.className = 'lab-resp';
    const status = document.createElement('p'); status.className = 'lab-status'; status.setAttribute('aria-live', 'polite');
    fig.append(stage, ctl, status);
    let misled = [], qs = [], q = 0, tests = [], ans = [], phase = 'idle', used = 0;
    const buttons = (list) => { ctl.innerHTML = ''; list.forEach(([t, fn, cls]) => action(ctl, t, fn, cls)); };
    const begin = () => {
      used++;
      const order = shuffle([0, 1, 2, 3]); misled = [order[0], order[1]];
      qs = shuffle(LURES.map((l, i) => (misled.includes(i) ? l[1] : l[2])));
      qs.splice(2, 0, '女士发现手机不见以后，你觉得她最可能先做什么？');
      tests = shuffle([...LURES.map((l, i) => ({ s: l[0], real: false, misled: misled.includes(i) })), ...TRUE_ITEMS.map((s) => ({ s, real: true }))]);
      ans = tests.map(() => null); q = 0; phase = 'read';
      stage.innerHTML = `<p class="lab-story">${STORY}</p>`;
      status.textContent = used > 1 ? '你已经知道这个演示的设计了，第二次的结果和第一次没有可比性，只适合看看流程。' : '按平常的速度读一遍，不用刻意背。';
      buttons([['读完了', ask]]); ctl.querySelector('button').focus();
    };
    const ask = () => {
      phase = 'ask';
      stage.innerHTML = `<p class="lab-k">问题 ${q + 1} / ${qs.length}</p><p class="lab-q">${qs[q]}</p>`;
      status.textContent = '想一想你的回答，不用写下来。';
      buttons([[q + 1 < qs.length ? '下一个问题' : '进入记忆测验', () => { q++; if (q < qs.length) ask(); else test(); }]]); ctl.querySelector('button').focus();
    };
    const test = () => {
      phase = 'test'; ctl.innerHTML = '';
      stage.innerHTML = '<p class="lab-q">下面每一条，<b>故事本身</b>里有没有提到？只算故事里写到的，不算问题里说到的。</p>' + tests.map((t, i) => `
        <div class="lab-item" role="group" aria-label="${t.s}"><p>${i + 1}. ${t.s}</p>
          <div class="lab-opts" data-i="${i}">${['故事里有', '故事里没有'].map((x, j) => `<button type="button" class="choice" data-yes="${j === 0}" aria-pressed="false">${x}</button>`).join('')}
          <span class="lab-conf">${CONF.map((c, j) => `<button type="button" class="choice" data-c="${j}" aria-pressed="false">${c}</button>`).join('')}</span></div></div>`).join('');
      stage.querySelectorAll('.lab-opts').forEach((g) => g.addEventListener('click', (e) => {
        const b = e.target.closest('.choice'); if (!b) return;
        const i = Number(g.dataset.i); ans[i] = ans[i] || {};
        if (b.dataset.yes) { ans[i].yes = b.dataset.yes === 'true'; g.querySelectorAll('[data-yes]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }
        else { ans[i].c = Number(b.dataset.c); g.querySelectorAll('[data-c]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }
        finishBtn.disabled = !ans.every((a) => a && a.yes !== undefined && a.c !== undefined);
      }));
      status.textContent = '每一条都选好“有／没有”和确定程度后，点“看结果”。';
      const finishBtn = action(ctl, '看结果', reveal); finishBtn.disabled = true;
      stage.querySelector('.choice').focus();
    };
    const reveal = () => {
      if (phase !== 'test') return;
      phase = 'done';
      const fa = (m) => tests.map((t, i) => [t, ans[i]]).filter(([t]) => !t.real && t.misled === m);
      const yesM = fa(true).filter(([, a]) => a.yes).length, yesN = fa(false).filter(([, a]) => a.yes).length;
      const hits = tests.map((t, i) => [t, ans[i]]).filter(([t]) => t.real);
      stage.innerHTML = `<p class="lab-k">故事原文（问题里加进去的细节都不在其中）</p><p class="lab-story">${STORY}</p>
        <div class="l-table" role="region" tabindex="0" aria-label="逐条结果"><table><thead><tr><th>说法</th><th class="lab-nw">原文</th><th>你的回答</th></tr></thead><tbody>${tests.map((t, i) => `<tr><td>${t.s}${t.real ? '' : t.misled ? '<br><span class="lab-k">问题里暗示过</span>' : '<br><span class="lab-k">问题里没提过</span>'}</td><td class="lab-nw">${t.real ? '有' : '没有'}</td><td>${ans[i].yes ? '有' : '没有'}（${CONF[ans[i].c]}）${ans[i].yes !== t.real ? ' <b class="lab-wrong">✕</b>' : ''}</td></tr>`).join('')}</tbody></table></div>`;
      status.textContent = '';
      buttons([['重新开始', begin, 'lab-clear']]);
      out.innerHTML = `<ul class="lab-parts lab-flow"><li><span>问题里暗示过的两个细节：你说“故事里有”</span><b>${yesM} / 2</b></li><li><span>问题里没提过的两个细节：你说“故事里有”</span><b>${yesN} / 2</b></li><li><span>故事里真有的四个细节：你认出了</span><b>${hits.filter(([, a]) => a.yes).length} / 4</b></li></ul>
        <p>${yesM > yesN ? '你把问题里暗示过的细节，更多地当成了故事里的内容。这正是误导信息效应的方向：事后接触的信息和原始经历混在一起，来源被记错了。' : yesM === yesN && yesM === 0 ? '你没有把任何一个暗示过的细节当成故事内容。这很常见：故事很短，测验紧接着问题，而且明确提醒了“只算故事里写到的”，这些都会削弱误导效应。' : '这一次，问题里的暗示没有让你更多地把那些细节当成故事内容。只有两对细节，偶然波动很大。'}</p>
        <p>研究中，误导效应是比较许多人的平均结果得出的：被误导的一组，平均比没有被误导的一组更常报告那些细节。它说的是一种倾向，不是“每个人都会被误导”，也不能据此判断某一个人。</p>`;
    };
    action(actions, '开始', begin);
    stage.innerHTML = '<p class="lab-q">点“开始”。整个过程大约三分钟。</p>';
    out.innerHTML = '';
  }

  /* 06-05 · spacing: an illustrative model of one review, a gap after first study, and a final test.
     Recall after t days with stability S is (1 + t/S)^-0.4. At the review, the item is recalled with that
     probability; if it is, stability grows by a factor that is larger the harder the recall was
     (1 + A·(1−r)^3); if it is not, the review counts as learning it again from scratch. */
  const SPC = { S0: 2, D: 0.4, K: 3, A: { reread: 320, test: 640 } };
  const RIS = [[7, '1 周后'], [35, '5 周后'], [70, '10 周后'], [350, '1 年后']];
  const spR = (t, S) => Math.pow(1 + t / S, -SPC.D);
  const spFinal = (g, ri, mode) => { const r = spR(g, SPC.S0), S1 = SPC.S0 * (1 + SPC.A[mode] * Math.pow(1 - r, SPC.K)); return r * spR(ri, S1) + (1 - r) * spR(ri, SPC.S0); };
  function spacing(host) {
    const o = { ri: 35, mode: 'reread' };
    const { fig, out, actions } = shell(host, '隔多久复习一次最好？',
      '一个模拟的学习者先学一组材料，过一段时间（横轴）复习一次，复习之后再过一段时间参加考试。你可以改变考试离复习有多远，以及复习的方式。四条曲线对应四个考试时间，当前选中的一条加粗；每条曲线的最高点用圆点标出。',
      [['ri', '考试在复习之后', RIS.map(([v, t]) => [v, t])], ['mode', '复习的方式', [['reread', '重读一遍'], ['test', '先自测，再看答案']]]],
      '这是一个说明原理的简化模型，不是实验数据。曲线的形状（最佳间隔随考试时间变长而变长、但占考试时间的比例越来越小）参考了切佩达等人（2008）的研究；具体的天数和百分比都由模型参数决定，换一组参数就会不同，不能直接用来安排复习。', MODEL);
    const GMAX = 40;
    const draw = () => {
      const W = widthOf(fig), H = 290;
      fig.innerHTML = '';
      const gs = Array.from({ length: GMAX * 4 + 1 }, (_, i) => i / 4);
      const all = RIS.map(([ri]) => { const v = gs.map((g) => spFinal(g, ri, o.mode)); let k = 0; v.forEach((x, i) => { if (x > v[k]) k = i; }); return { ri, v, k }; });
      const cur = all.find((c) => c.ri === o.ri), gOpt = gs[cur.k], best = cur.v[cur.k], mass = cur.v[0], rAt = spR(gOpt, SPC.S0);
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `模型结果：考试在复习之后 ${o.ri} 天，复习方式为${o.mode === 'test' ? '先自测再看答案' : '重读'}。不间隔（当天复习）时考试成绩约 ${Math.round(mass * 100)}%；最佳间隔约 ${fmt(gOpt, 0)} 天，成绩约 ${Math.round(best * 100)}%。` }, fig);
      const { X, Y } = lc(svg, W, H, { xMax: GMAX, yMax: 1, xTicks: [0, 10, 20, 30, 40], yTicks: [[0, '0'], [0.5, '50%'], [1, '100%']], xLab: '第一次学习到复习的间隔（天）', yLab: '考试时能回忆的比例', L: 46 });
      all.forEach((c) => line(svg, gs.map((g, i) => [X(g), Y(c.v[i])]), c === cur ? 'fx-ln fx-lr fx-curve' : 'fx-ln fx-faint'));
      line(svg, all.map((c) => [X(gs[c.k]), Y(c.v[c.k])]), 'fx-ln fx-lb fx-dash');
      all.forEach((c) => el('circle', { cx: X(gs[c.k]), cy: Y(c.v[c.k]), r: c === cur ? 5.5 : 3.5, class: c === cur ? 'fx-node r' : 'fx-node b' }, svg));
      text(svg, X(gs[cur.k]) + 8, Y(best) - 8, `约 ${fmt(gOpt, 0)} 天`, 'lab-s b fx-halo');
      const other = o.mode === 'test' ? 'reread' : 'test', bestOther = Math.max(...gs.map((g) => spFinal(g, o.ri, other)));
      out.innerHTML = `<p class="fx-keys"><span><i class="k hi"></i>当前选中的考试时间</span><span><i class="k dash"></i>连接各条曲线最高点的“山脊线”</span></p>
        <ul class="lab-parts lab-flow"><li><span>当天复习（间隔为 0）</span><b>${Math.round(mass * 100)}%</b></li><li><span>最佳间隔：约 ${fmt(gOpt, 0)} 天（约为考试间隔的 ${Math.round((gOpt / o.ri) * 100)}%）</span><b>${Math.round(best * 100)}%</b></li><li><span>在最佳间隔复习时，复习前能先想起来的比例</span><b>${Math.round(rAt * 100)}%</b></li><li><span>同样的间隔，如果${o.mode === 'test' ? '只是重读' : '改成先自测'}，最好的成绩</span><b>${Math.round(bestOther * 100)}%</b></li></ul>
        <p>在这个模型里，间隔太短，复习时材料还很熟，复习几乎没有加固作用；间隔太长，材料已经忘了，复习只能从头学起。最好的间隔落在两者之间：复习时要费点劲才想得起来，但还想得起来。考试越远，这个“恰好”的点就越靠后；可它占考试间隔的比例反而越来越小。</p>
        <p>注意第三行：在最佳间隔复习时，学习者往往只能先想起一部分，复习的感觉并不顺畅。这正是“合意困难”的含义：当时更吃力的安排，长远来看记得更牢。</p>`;
    };
    bindControls(host, o, draw);
    action(actions, '恢复默认设置', () => { o.ri = 35; o.mode = 'reread'; host.querySelectorAll('.lab-opts .choice').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === String(o[b.dataset.k])))); draw(); }, 'lab-clear');
    draw();
    onResize(draw);
  }

  /* =====================================================================
     Stage 07 · language and thought. Five activities the reader does in the
     browser. Results stay in the page; none is a validated test, and each
     says so on screen.
     ===================================================================== */
  const avgMs = (a) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : null);
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* 07-01 · self-paced reading: a temporarily ambiguous opening, and the same sentence with a classifier in front */
  const GP = [ // four segments; the last field is the classifier that removes the ambiguity
    ['咬死了', '猎人的狗', '跑进了', '树林。', '那只'],
    ['撞倒了', '老人的司机', '逃离了', '现场。', '那个'],
    ['救起了', '邻居的女孩', '得到了', '表彰。', '那位'],
    ['批评了', '经理的员工', '被公司', '调走了。', '那个'],
  ];
  const CRIT = 2; // the segment that shows which structure is right
  function garden(host) {
    const { fig, out, actions } = shell(host, '一段一段地读句子',
      '下面有四个句子。每次只显示一段，其余部分用横线遮住；读懂这一段以后，按空格键或点“下一段”看下一段。请按平时的速度读，读懂为止，不必抢快。程序会记下你在每一段上停留的时间。四句中有两句开头没有任何提示，另外两句开头多了“那只”“那个”这样的词。',
      [], '这是一个教学演示，不是经过验证的测量。只有四个句子，手指的快慢、走神、对句子的熟悉程度都会让结果大幅波动；这几个句子是为演示编写的，没有经过正式研究的检验。你的结果只保存在这个页面里，刷新就会清空。', TASK);
    const box = document.createElement('div'); box.className = 'lab-stroop lab-spr'; box.setAttribute('aria-live', 'polite');
    const ctl = document.createElement('div'); ctl.className = 'lab-resp';
    const status = document.createElement('p'); status.className = 'lab-status'; status.setAttribute('aria-live', 'polite');
    fig.append(box, ctl, status);
    const go = action(ctl, '开始读', () => step());
    const res = { gp: [], ctl: [] };
    let flip = Math.random() < 0.5, trials = [], k = 0, seg = -1, t0 = 0, phase = 'idle';
    const render = () => {
      const s = trials[k].s;
      box.innerHTML = s.map((x, i) => (i === seg ? `<span>${x}</span>` : `<span class="lab-mask" aria-hidden="true">${x}</span>`)).join('');
    };
    const ready = () => {
      phase = 'ready'; seg = -1; box.textContent = `第 ${k + 1} / ${trials.length} 句`;
      go.textContent = '开始读'; status.textContent = '准备好以后，按空格键或点“开始读”。';
    };
    const begin = () => {
      trials = shuffle(GP.map((it, i) => { const c = (i < 2) !== flip ? 'gp' : 'ctl'; return { c, s: c === 'ctl' ? [it[4] + it[0], ...it.slice(1, 4)] : it.slice(0, 4) }; }));
      flip = !flip; k = 0; ctl.hidden = false; ready(); go.focus();
    };
    const step = () => {
      const now = performance.now();
      if (phase === 'ready') { phase = 'read'; seg = 0; go.textContent = '下一段 →'; status.textContent = '读懂这一段以后，按空格键或点“下一段”。'; render(); t0 = now; return; }
      if (phase !== 'read') return;
      if (seg === CRIT) res[trials[k].c].push(Math.min(now - t0, 6000));
      seg++; t0 = now;
      if (seg < 4) { render(); return; }
      k++;
      if (k < trials.length) { ready(); return; }
      phase = 'done'; ctl.hidden = true;
      box.innerHTML = trials.map((t) => `<p>${t.s.map((x, i) => (i === CRIT ? `<b>${x}</b>` : x)).join('')}</p>`).join('');
      box.classList.add('lab-done');
      status.textContent = '这一轮读完了。加粗的是用来比较的那一段。';
      report();
    };
    const report = () => {
      const g = avgMs(res.gp), c = avgMs(res.ctl), n = res.gp.length;
      out.innerHTML = n ? `<ul class="lab-parts lab-flow"><li><span>开头没有提示的句子，读到“跑进了”“逃离了”这类关键段（${n} 句）</span><b>平均 ${g} 毫秒</b></li><li><span>开头有“那只”“那个”的句子，同一位置（${res.ctl.length} 句）</span><b>平均 ${c} 毫秒</b></li></ul>
        <p>没有“那只”时，“咬死了猎人的狗”最容易被读成“（有人）咬死了猎人的狗”：狗是被咬死的。读到“跑进了”，这个理解接不下去，必须回头把“咬死了猎人的”改成描述“狗”的成分：原来是狗咬死了猎人。开头有了“那只”，读者一开始就预期后面会出现一个名词，“咬死了猎人的”自然被当作在描述它，不需要改。</p>
        <p>如果你在没有提示的句子上，关键段停得更久，这就是研究者说的“花园路径”效应。如果没有，也不奇怪：句子太少，每句的词又不一样。${res.gp.length < 4 ? '再做一轮，两组句子会对调，比较起来更公平。' : '两组句子已经对调过，比较更公平一些，但样本仍然很小。'}</p>`
        : '<p>读完四句以后，这里会比较两种句子在关键段上停留的时间。</p>';
    };
    action(actions, '开始', () => { box.classList.remove('lab-done'); begin(); });
    action(actions, '清空结果', () => { res.gp = []; res.ctl = []; phase = 'idle'; ctl.hidden = true; box.classList.remove('lab-done'); box.textContent = ''; status.textContent = '点“开始”。'; report(); }, 'lab-clear');
    ctl.hidden = true; status.textContent = '点“开始”。'; report();
  }

  /* 07-02 · statistical learning: a syllable stream with no pauses, then word versus part-word choices */
  const SW = ['tupiro', 'golabu', 'bidaku', 'padoti'];
  const sylOf = (w) => w.match(/.{2}/g);
  function stream(host) {
    const { fig, out, actions } = shell(host, '没有停顿的音节流里，哪些是“词”？',
      '点“开始”后，屏幕上会一个接一个地出现无意义的音节，每秒三个左右，中间没有停顿，也没有标点，持续大约一分钟。你不需要刻意记什么，看着它们，最好在心里默念出来。看完以后，程序会给你八对音节组合，请凭感觉选出更像这种“语言”里的词的那一个。',
      [], '这是一个教学演示，不是经过验证的测量。原始研究让 8 个月大的婴儿听两分钟录音，用他们听不同声音的时间长短来判断；这里改成成年人看文字、做选择，只借用了它的逻辑。音节流每次由程序随机生成；最后列出的转移概率，是从你这一次看到的音节流里实际数出来的。', TASK);
    const box = document.createElement('div'); box.className = 'lab-stroop lab-word';
    const ctl = document.createElement('div'); ctl.className = 'lab-resp';
    const status = document.createElement('p'); status.className = 'lab-status'; status.setAttribute('aria-live', 'polite');
    fig.append(box, ctl, status);
    let cancel = () => {}, syl = [], tests = [], t = 0, hits = 0, skipped = false, phase = 'idle', parts = [];
    const make = () => {
      const ws = []; while (ws.length < 60) { const w = SW[Math.floor(Math.random() * 4)]; if (w !== ws[ws.length - 1]) ws.push(w); }
      syl = ws.flatMap(sylOf);
      // part-words span a boundary: the last syllable of one word and the first two of the word that most often followed it
      parts = SW.map((x) => {
        const n = {}; ws.forEach((w, i) => { if (w === x && ws[i + 1]) n[ws[i + 1]] = (n[ws[i + 1]] || 0) + 1; });
        const y = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
        return sylOf(x)[2] + sylOf(y).slice(0, 2).join('');
      });
    };
    const tp = (a, b) => { let n = 0, m = 0; syl.forEach((s, i) => { if (s === a && i < syl.length - 1) { n++; if (syl[i + 1] === b) m++; } }); return n ? m / n : 0; };
    const begin = () => {
      cancel(); make(); skipped = false; phase = 'show'; ctl.innerHTML = ''; out.innerHTML = '';
      status.textContent = '看着音节，在心里默念。大约一分钟。';
      action(ctl, '跳过，直接选择', () => { skipped = true; cancel(); test(); }, 'lab-clear');
      cancel = present(box, syl, 280, 30, test);
    };
    const test = () => {
      phase = 'test'; t = 0; hits = 0;
      tests = shuffle([...SW, ...SW].map((w, i) => { const p = parts[(i + 1 + (i >= 4 ? 1 : 0)) % 4]; return Math.random() < 0.5 ? [w, p, 0] : [p, w, 1]; }));
      ask();
    };
    const ask = () => {
      const [a, b, right] = tests[t];
      box.textContent = '哪一个更像词？';
      status.textContent = `第 ${t + 1} / ${tests.length} 对。凭感觉选，不必犹豫。`;
      ctl.innerHTML = '';
      [a, b].forEach((s, i) => action(ctl, s, () => { if (i === right) hits++; t++; if (t < tests.length) ask(); else done(); }, 'lab-big'));
      ctl.querySelector('button').focus();
    };
    const done = () => {
      phase = 'done'; ctl.innerHTML = ''; box.textContent = SW.join(' · ');
      status.textContent = '上面是这种“语言”里真正的四个词。';
      const within = SW.flatMap((w) => { const s = sylOf(w); return [tp(s[0], s[1]), tp(s[1], s[2])]; });
      const across = SW.map((w, i) => [sylOf(w)[2], parts[i].slice(2, 4)]);
      out.innerHTML = `<ul class="lab-parts lab-flow"><li><span>八对里，你选中真正的词的次数（随便猜，平均是 4 次）</span><b>${hits} / ${tests.length}</b></li>
        <li><span>词的内部，一个音节后面跟着下一个音节的概率（8 处，平均）</span><b>${Math.round((within.reduce((s, x) => s + x, 0) / within.length) * 100)}%</b></li>
        ${across.map(([a, b]) => `<li><span>跨过词的边界：${a} 后面接 ${b} 的概率</span><b>${Math.round(tp(a, b) * 100)}%</b></li>`).join('')}</ul>
        <p>和你比较的“非词”（比如 ${parts[0]}）也在音节流里出现过，只是它跨过了两个词的边界。在一个词的内部，前一个音节决定了下一个音节；跨过边界时，后面可能接另外三个词中的任何一个，概率就低得多（平均约三分之一；上面列的是每个词后面最常接的那个词，所以略高一些）。转移概率在哪里突然下降，哪里就可能是词的边界。</p>
        <p>${skipped ? '你跳过了音节流，这一轮的选择只能是猜测。' : hits >= 6 ? '你选中的真正的词明显多于猜测，说明你可能在不知不觉中利用了这种统计规律。' : '你的成绩与猜测差别不大。这并不奇怪：只看了一分钟文字，八次选择的偶然波动也很大。'}看文字的成年人和听声音的婴儿用的可能不是完全一样的过程，这个演示只说明“规律就在输入里”。</p>`;
    };
    action(actions, '开始', begin);
    action(actions, '重来', () => { cancel(); phase = 'idle'; ctl.innerHTML = ''; box.textContent = ''; out.innerHTML = ''; status.textContent = '点“开始”。'; }, 'lab-clear');
    status.textContent = '点“开始”。';
  }

  /* 07-03 · a name and a drawing: does the label pull the memory toward itself? Four ambiguous drawings,
     each with two names; p < 0 leans toward the first name, p > 0 toward the second */
  const LSHAPES = [
    [['哑铃', '眼镜'], (g, p) => {
      el('circle', { cx: 28, cy: 52, r: 16 }, g); el('circle', { cx: 72, cy: 52, r: 16 }, g);
      if (p > 0) {
        el('path', { d: `M44,52 Q50,${52 - 16 * p} 56,52` }, g);
        el('path', { d: `M12,${50 - 2 * p} L${12 - 6 * p},${50 - 12 * p}` }, g); el('path', { d: `M88,${50 - 2 * p} L${88 + 6 * p},${50 - 12 * p}` }, g);
      } else if (p < 0) { el('path', { d: `M44,${52 - 4 * -p} H56 M44,${52 + 4 * -p} H56` }, g); el('circle', { cx: 28, cy: 52, r: 7 * -p, class: 'f' }, g); el('circle', { cx: 72, cy: 52, r: 7 * -p, class: 'f' }, g); }
      else el('path', { d: 'M44,52 H56' }, g);
    }],
    [['车轮', '太阳'], (g, p) => {
      el('circle', { cx: 50, cy: 50, r: 20 }, g);
      const a = p > 0 ? 0.7 + 0.5 * p : 0.7 + 0.6 * p, b = p > 0 ? 1.35 + 0.35 * p : 1.35 + 0.4 * p;
      for (let i = 0; i < 8; i++) { const t = (i * Math.PI) / 4, c = Math.cos(t), s = Math.sin(t); el('path', { d: `M${50 + 20 * a * c},${50 + 20 * a * s} L${50 + 20 * b * c},${50 + 20 * b * s}` }, g); }
      if (p < 0) el('circle', { cx: 50, cy: 50, r: 5 * -p, class: 'f' }, g);
    }],
    [['小山', '帽子'], (g, p) => {
      const half = 22 - 6 * p, h = 30 + 8 * p, base = 70, brim = p > 0 ? 32 + 10 * p : 32 + 10 * p;
      el('path', { d: `M${50 - half},${base} C${50 - half},${base - h * 1.3} ${50 + half},${base - h * 1.3} ${50 + half},${base}` }, g);
      el('path', { d: `M${50 - brim},${base} H${50 + brim}` }, g);
      if (p > 0) el('path', { d: `M${50 - half + 1},${base - 7 * p} H${50 + half - 1}` }, g);
    }],
    [['箭头', '松树'], (g, p) => {
      el('path', { d: `M50,16 V${p > 0 ? 78 : 84}` }, g);
      const tiers = p > 0 ? [[16, 13], [32, 18], [48, 23]] : p < 0 ? [[16, 16]] : [[16, 16], [34, 16]];
      tiers.forEach(([y, w]) => el('path', { d: `M${50 - w},${y + w * 0.9} L50,${y} L${50 + w},${y + w * 0.9}` }, g));
      if (p < 0) el('path', { d: 'M42,88 L50,80 L58,88 M42,80 L50,72 L58,80' }, g);
      if (p > 0) el('path', { d: 'M44,78 H56 V86 H44 Z' }, g);
    }],
  ];
  const labelSvg = (i, p, size) => {
    const s = el('svg', { viewBox: '0 0 100 100', width: size, height: size, 'aria-hidden': 'true' });
    LSHAPES[i][1](el('g', { class: 'lab-shape' }, s), p);
    return s;
  };
  function label(host) {
    const { fig, out, actions } = shell(host, '一个名字，会不会改变你记住的样子？',
      '屏幕上会依次出现四个简单的线条图，每个停留三秒多。每个图下面都写着它“像什么”。看完以后，每个图会有三个版本让你挑：哪一个是你刚才看到的？三个版本中，一个是原图，一个更像你看到的那个名字，一个更像另一个名字。',
      [], '这是一个教学演示，不是经过验证的测量。只有四个图形，偶然性很大；图形是为演示画的，不是经典研究里的原图。经典研究让人凭记忆画出来，这里改成从三个里挑，名字的影响可能更难显现。结果只保存在这个页面里。', TASK);
    const box = document.createElement('div'); box.className = 'lab-stroop lab-show'; box.setAttribute('aria-live', 'polite');
    const grid = document.createElement('div'); grid.className = 'lab-grid lab-g3';
    const status = document.createElement('p'); status.className = 'lab-status'; status.setAttribute('aria-live', 'polite');
    fig.append(box, grid, status);
    const tally = { orig: 0, toward: 0, away: 0 };
    let side = shuffle([0, 0, 1, 1]), order = [], k = 0, timer = 0, rounds = 0;
    const stop = () => clearTimeout(timer);
    const study = () => {
      if (k >= order.length) { k = 0; order = shuffle([0, 1, 2, 3]); return test(); }
      const i = order[k];
      box.innerHTML = ''; box.append(labelSvg(i, 0, 150));
      const cap = document.createElement('p'); cap.innerHTML = `这个图形像<b>${LSHAPES[i][0][side[i]]}</b>`; box.append(cap);
      status.textContent = `第 ${k + 1} / 4 个图形`;
      timer = setTimeout(() => { box.innerHTML = ''; k++; timer = setTimeout(study, 500); }, 3300);
    };
    const begin = () => { stop(); grid.innerHTML = ''; order = shuffle([0, 1, 2, 3]); k = 0; study(); };
    const test = () => {
      if (k >= order.length) return done();
      const i = order[k], lean = side[i] ? 1 : -1;
      box.innerHTML = '<p>刚才看到的是哪一个？</p>';
      status.textContent = `第 ${k + 1} / 4 个。点一下你认为是原图的那个。`;
      grid.innerHTML = '';
      shuffle([['orig', 0], ['toward', 0.85 * lean], ['away', -0.85 * lean]]).forEach(([kind, p], j) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'lab-cellbtn';
        b.setAttribute('aria-label', `第 ${j + 1} 个版本`); b.append(labelSvg(i, p, 100));
        b.addEventListener('click', () => { tally[kind]++; k++; test(); });
        grid.append(b);
      });
      grid.querySelector('button').focus();
    };
    const done = () => {
      rounds++; grid.innerHTML = ''; box.innerHTML = '<p>这一轮结束了。</p>';
      side = side.map((x) => 1 - x); // next round: each drawing gets the other name
      status.textContent = rounds === 1 ? '再做一轮，每个图形会配上另一个名字。' : `已经做了 ${rounds} 轮。`;
      report();
    };
    const report = () => {
      const n = tally.orig + tally.toward + tally.away;
      out.innerHTML = n ? `<ul class="lab-parts lab-flow"><li><span>选中原图</span><b>${tally.orig} / ${n}</b></li><li><span>选错了，选的是更像“你看到的名字”的版本</span><b>${tally.toward}</b></li><li><span>选错了，选的是更像“另一个名字”的版本</span><b>${tally.away}</b></li></ul>
        <p>如果名字会把记忆往它那边拉，错误应该更多地落在第二行，而不是第三行。只做了 ${n} 次选择，两种错误的差别很容易是偶然的；${tally.toward + tally.away === 0 ? '你全部选对了，这在“从三个里挑”的任务中很常见，原图就在眼前，比凭记忆画出来容易得多。' : '把几轮的结果加在一起看，才稍微有点意义。'}</p>
        <p>注意，即使出现了偏向，也不能直接说名字改变了你“看到”的样子：它可能只是在你拿不准的时候，影响了你的猜测。区分这几种可能，正是演示下面那几段要讨论的问题。</p>`
        : '<p>做完一轮以后，这里会统计你的选择。</p>';
    };
    action(actions, '开始', begin);
    action(actions, '清空结果', () => { stop(); tally.orig = tally.toward = tally.away = 0; rounds = 0; grid.innerHTML = ''; box.innerHTML = ''; status.textContent = '点“开始”。'; report(); }, 'lab-clear');
    status.textContent = '点“开始”。'; report();
  }

  /* 07-04 · the nine-dot problem: four straight lines, drawn without lifting the pen, through all nine dots */
  function ninedot(host) {
    const { fig, out, actions } = shell(host, '一笔画四条直线，穿过九个点',
      '用不超过四条首尾相连的直线，穿过全部九个点，中间不能“抬笔”。依次点击网格上的点来画线：第一次点击是起点，之后每点一次，就从上一个点画一条直线到这里。用键盘时，先按 Tab 选中图形，用方向键移动蓝色的圈，按 Enter 或空格确定，按 Backspace 撤销。',
      [], '这是一个经典的思维题，不是能力测验。做不出来很正常，它不能说明你的智力或创造力。结果只保存在这个页面里。', TASK);
    const S = 320, P = (c) => 40 + (c + 1) * 60, svg = el('svg', { viewBox: `0 0 ${S} ${S}`, class: 'lab-dots', tabindex: 0, role: 'application', 'aria-label': '九点问题的画板：五乘五的网格，中间三乘三是九个要穿过的点。' }, fig);
    const status = document.createElement('p'); status.className = 'lab-status'; status.setAttribute('aria-live', 'polite');
    fig.append(status);
    const DOTS = []; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) DOTS.push([x, y]);
    const SOL = [[0, 0], [3, 0], [0, 3], [0, 0], [2, 2]];
    let pts = [], cur = [1, 1], shown = false;
    const on = (d, a, b) => { const cr = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]); if (cr) return false; return d[0] >= Math.min(a[0], b[0]) && d[0] <= Math.max(a[0], b[0]) && d[1] >= Math.min(a[1], b[1]) && d[1] <= Math.max(a[1], b[1]); };
    const covered = () => DOTS.map((d) => pts.some((p, i) => i && on(d, pts[i - 1], p)));
    const draw = () => {
      svg.innerHTML = '';
      for (let y = -1; y <= 3; y++) for (let x = -1; x <= 3; x++) el('circle', { cx: P(x), cy: P(y), r: 3, class: 'lab-lat' }, svg);
      if (pts.length > 1) el('path', { d: 'M' + pts.map(([x, y]) => `${P(x)},${P(y)}`).join(' L'), class: 'lab-path' }, svg);
      const cov = covered();
      DOTS.forEach(([x, y], i) => el('circle', { cx: P(x), cy: P(y), r: 9, class: 'lab-dot9' + (cov[i] ? ' on' : '') }, svg));
      if (pts.length) { const [x, y] = pts[pts.length - 1]; el('circle', { cx: P(x), cy: P(y), r: 5, class: 'lab-end' }, svg); }
      if (document.activeElement === svg) el('circle', { cx: P(cur[0]), cy: P(cur[1]), r: 16, class: 'lab-cur' }, svg);
      const lines = Math.max(0, pts.length - 1), n = cov.filter(Boolean).length;
      status.textContent = shown ? '这是一种解法：线要延伸到九个点围成的方框之外。'
        : n === 9 && lines <= 4 ? `成功了！你用 ${lines} 条线穿过了全部九个点。`
        : lines >= 4 ? `四条线用完了，穿过了 ${n} / 9 个点。点“撤销一步”或“重来”。`
        : pts.length ? `已画 ${lines} 条线，穿过了 ${n} / 9 个点。` : '点击网格上的任意一点作为起点。';
    };
    const add = (p) => {
      if (shown) { shown = false; pts = []; }
      const last = pts[pts.length - 1];
      if (pts.length >= 5 || (last && last[0] === p[0] && last[1] === p[1])) return;
      if (covered().every(Boolean) && pts.length > 1) return;
      pts.push(p); draw();
    };
    svg.addEventListener('click', (e) => {
      const r = svg.getBoundingClientRect(), k = S / r.width;
      const x = Math.round(((e.clientX - r.left) * k - 40) / 60) - 1, y = Math.round(((e.clientY - r.top) * k - 40) / 60) - 1;
      if (x < -1 || x > 3 || y < -1 || y > 3) return;
      cur = [x, y]; add([x, y]);
    });
    svg.addEventListener('keydown', (e) => {
      const mv = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[e.key.toLowerCase()];
      if (mv) { cur = [Math.max(-1, Math.min(3, cur[0] + mv[0])), Math.max(-1, Math.min(3, cur[1] + mv[1]))]; draw(); }
      else if (e.key === 'Enter' || e.key === ' ') add([...cur]);
      else if (e.key === 'Backspace') { pts.pop(); draw(); }
      else return;
      e.preventDefault();
    });
    svg.addEventListener('focus', draw); svg.addEventListener('blur', draw);
    action(actions, '撤销一步', () => { if (shown) return; pts.pop(); draw(); }, 'lab-clear');
    action(actions, '重来', () => { pts = []; shown = false; out.innerHTML = ''; draw(); }, 'lab-clear');
    action(actions, '提示', () => { out.innerHTML = '<p>提示：线可以画到九个点围成的方框外面去。不过研究发现，即使明确告诉人们这一点，能很快做出来的人仍然不多（见这一讲第五节）。</p>'; }, 'lab-clear');
    action(actions, '看一种解法', () => { pts = SOL.map((p) => [...p]); shown = true; draw(); out.innerHTML = '<p>四条线：沿上边一直画到方框外，斜着穿回左下方之外，再沿左边向上，最后沿对角线斜下。关键的两步都要“出界”。</p>'; }, 'lab-clear');
    draw();
  }

  /* 07-04 · alternative uses for a brick: how many ideas, and which are not on a short list of common ones */
  const COMMON = [/盖|建|砌|墙|房|垒|铺|筑/, /垫/, /压|镇纸/, /门/, /砸|敲|锤|捶|核桃|钉/, /武器|防身|打人|自卫|扔/, /灶|烧烤|烤|锅|生火/, /花坛|花池|围/, /台阶|垫脚|踩|踏/, /健身|举|锻炼|哑铃/];
  const USE_S = 120;
  function uses(host) {
    const { fig, out, actions } = shell(host, '一块砖头，能用来做什么？',
      `在 ${USE_S / 60} 分钟内，尽可能多地写出一块普通砖头的用途，越不寻常越好。每行写一个，也可以用逗号、顿号隔开。可以提前点“写完了”。`,
      [], '这是一个教学活动，不是创造力测验。程序只会按一张很短的“常见用途”示意清单做标记，这张清单是为演示编写的，不是研究中的常模；“不在清单里”不等于“有创意”。你写的内容不会被发送到任何地方，刷新就会清空。', TASK);
    const rec = recallArea('砖头的用途', '例如：盖房子\n压住被风吹的纸');
    const area = rec.querySelector('textarea'); area.rows = 6;
    const ctl = document.createElement('div'); ctl.className = 'lab-resp';
    const status = document.createElement('p'); status.className = 'lab-status'; status.setAttribute('aria-live', 'polite');
    fig.append(rec, ctl, status);
    let clock = 0, left = 0;
    const stop = () => clearInterval(clock);
    const begin = () => {
      stop(); area.value = ''; area.disabled = false; rec.hidden = false; out.innerHTML = ''; left = USE_S;
      ctl.innerHTML = ''; action(ctl, '写完了', finish);
      status.textContent = `还剩 ${left} 秒。`; area.focus();
      clock = setInterval(() => { left--; if (left <= 0) finish(); else status.textContent = `还剩 ${left} 秒。`; }, 1000);
    };
    const finish = () => {
      stop(); ctl.innerHTML = ''; area.disabled = true;
      const ideas = [...new Set(area.value.split(/[\n,，、;；。]+/).map((s) => s.trim()).filter(Boolean))];
      const rare = ideas.map((s) => !COMMON.some((re) => re.test(s)));
      const h = Math.ceil(ideas.length / 2), share = (a) => (a.length ? Math.round((a.filter(Boolean).length / a.length) * 100) + '%' : '—');
      status.textContent = `时间到了，或者你已经写完。你一共写了 ${ideas.length} 条。`;
      out.innerHTML = ideas.length ? `<ul class="lab-parts lab-flow">${ideas.map((s, i) => `<li><span>${i + 1}. ${esc(s)}</span><b>${rare[i] ? '不在示意清单里' : '常见'}</b></li>`).join('')}</ul>
        <ul class="lab-parts lab-flow"><li><span>想法的数量（研究中叫“流畅性”）</span><b>${ideas.length}</b></li>${ideas.length >= 4 ? `<li><span>前一半想法中，不在清单里的比例</span><b>${share(rare.slice(0, h))}</b></li><li><span>后一半想法中，不在清单里的比例</span><b>${share(rare.slice(h))}</b></li>` : ''}</ul>
        <p>很多人的前几个答案都是“盖房子”“垫东西”这类最先想到的用途，更不寻常的想法往往出现在后面。研究者正式计分时，会看一个想法在一大群人的答案里有多罕见，或者请几位评分者独立判断它有多新颖、多巧妙；这里的“清单”只是一个粗糙的替代。</p>
        <p>更重要的是这个任务<strong>没有</strong>测到的东西：想法是否真的可行，你能否从中挑出最好的一个并把它做出来，以及在你熟悉的领域里能否做出有价值的成果。这些都是创造力的一部分。</p>`
        : '<p>你还没有写下任何用途。点“开始”再试一次。</p>';
    };
    action(actions, '开始', begin);
    action(actions, '清空', () => { stop(); area.value = ''; area.disabled = false; rec.hidden = true; ctl.innerHTML = ''; out.innerHTML = ''; status.textContent = '点“开始”，计时开始。'; }, 'lab-clear');
    rec.hidden = true; status.textContent = '点“开始”，计时开始。';
  }

  /* =====================================================================
     Stage 08 · judgment and decision-making. Three activities the reader does
     in the browser and three illustrative models. Answers stay in the page;
     none is a validated assessment, and each says so on screen.
     ===================================================================== */
  const num = (s) => { const x = Number(String(s).replace(/[,，\s]/g, '')); return Number.isFinite(x) && x > 0 ? x : null; };
  const nf = (x) => (Math.abs(x) >= 100 ? Math.round(x).toLocaleString('zh-CN') : fmt(x, Math.abs(x) >= 10 ? 1 : 2).replace(/\.0+$/, ''));
  const slider = (label, min, max, step, value) => {
    const w = document.createElement('label'); w.className = 'lab-range';
    w.innerHTML = `<span class="lab-k">${label}<b></b></span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}">`;
    return { box: w, input: w.querySelector('input'), val: w.querySelector('b') };
  };

  /* 08-01 · anchoring: is the answer higher or lower than this number? then your own estimate.
     Two questions get a low comparison number and two a high one, at random. */
  const ANCHORS = [
    { q: '长江的全长大约是多少公里？', unit: '公里', truth: 6300, lo: 2000, hi: 12000, src: '长江全长约 6300 公里。' },
    { q: '成年人体内通常有多少块骨头？', unit: '块', truth: 206, lo: 80, hi: 450, src: '成年人通常有 206 块骨头。' },
    { q: '月球到地球的平均距离大约是多少万公里？', unit: '万公里', truth: 38.4, lo: 10, hi: 120, src: '月地平均距离约 38.4 万公里。' },
    { q: '联合国目前有多少个会员国？', unit: '个', truth: 193, lo: 60, hi: 400, src: '联合国有 193 个会员国。' },
  ];
  function anchor(host) {
    const { fig, out, actions } = shell(host, '先比较，再估计',
      '下面有四个问题。每个问题先给你一个数字，请判断答案比它高还是低；然后写下你自己的估计。不知道也没关系，凭感觉估计就好。',
      [], '这是一个教学演示，不是对理性程度的测量。每个问题给出的比较数字是程序随机安排的：两个问题用较低的数字，两个用较高的数字，它们与正确答案没有任何关系。只有四道题，一个人的结果受偶然因素影响很大；研究中的锚定效应，是比较大量参与者的平均结果得到的。你的回答只保存在这个页面里。', TASK);
    host.querySelector('.lab-ctrls').remove();
    const stage = document.createElement('div'); stage.className = 'lab-mis';
    const ctl = document.createElement('div'); ctl.className = 'lab-resp';
    const status = document.createElement('p'); status.className = 'lab-status'; status.setAttribute('aria-live', 'polite');
    fig.append(stage, ctl, status);
    let items = [], k = 0, used = 0;
    const begin = () => {
      used++;
      const hi = shuffle([true, true, false, false]);
      items = shuffle(ANCHORS.map((a, i) => ({ ...a, high: hi[i], a: hi[i] ? a.hi : a.lo, dir: null, est: null })));
      k = 0; out.innerHTML = ''; step1();
    };
    const head = () => `<p class="lab-k">问题 ${k + 1} / ${items.length}</p><p class="lab-q">${items[k].q}</p>`;
    const step1 = () => {
      const it = items[k];
      stage.innerHTML = head() + `<p>答案比 <b>${nf(it.a)} ${it.unit}</b> 更高，还是更低？</p>`;
      ctl.innerHTML = '';
      [['更高', 'up'], ['更低', 'down']].forEach(([t, v]) => action(ctl, t, () => { it.dir = v; step2(); }));
      status.textContent = used > 1 ? '你已经知道这个演示的设计了，这一轮的结果只适合看看流程。' : '';
      ctl.querySelector('button').focus();
    };
    const step2 = () => {
      const it = items[k];
      stage.innerHTML = head() + `<label class="lab-recall"><span class="lab-k">你的估计（${it.unit}）</span><input type="text" inputmode="decimal" autocomplete="off" placeholder="写一个数字"></label>`;
      const inp = stage.querySelector('input');
      ctl.innerHTML = '';
      const go = () => {
        const v = num(inp.value);
        if (v === null) { status.textContent = '请写一个大于 0 的数字。'; inp.focus(); return; }
        it.est = v; k++;
        if (k < items.length) step1(); else reveal();
      };
      action(ctl, k + 1 < items.length ? '下一题' : '看结果', go);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      status.textContent = ''; inp.focus();
    };
    const reveal = () => {
      const lr = (a) => a.reduce((s, it) => s + Math.log(it.est / it.truth), 0) / a.length;
      const H = items.filter((it) => it.high), L = items.filter((it) => !it.high);
      const rh = Math.exp(lr(H)), rl = Math.exp(lr(L));
      stage.innerHTML = `<div class="l-table" role="region" tabindex="0" aria-label="逐题结果"><table><thead><tr><th>问题</th><th class="lab-nw">比较数字</th><th class="lab-nw">你的估计</th><th class="lab-nw">实际</th></tr></thead><tbody>${items.map((it) => `<tr><td>${it.q}<br><span class="lab-k">${it.high ? '较高的数字' : '较低的数字'}</span></td><td class="lab-nw">${nf(it.a)}</td><td class="lab-nw">${nf(it.est)}</td><td class="lab-nw">${nf(it.truth)}</td></tr>`).join('')}</tbody></table></div>
        <p class="lab-note">${items.map((it) => it.src).join('')}</p>`;
      ctl.innerHTML = ''; action(ctl, '重新开始', begin, 'lab-clear');
      status.textContent = '';
      out.innerHTML = `<ul class="lab-parts lab-flow"><li><span>看到较高数字的两道题：你的估计平均是实际值的</span><b>${fmt(rh, 2)} 倍</b></li><li><span>看到较低数字的两道题：你的估计平均是实际值的</span><b>${fmt(rl, 2)} 倍</b></li></ul>
        <p>${rh > rl * 1.15 ? '在看到较高数字的题目上，你的估计相对于实际值偏得更高。这是锚定效应预测的方向：先考虑一个数字，会把后面的估计往它那边拉。' : rh * 1.15 < rl ? '这一次，你在看到较高数字的题目上，估计反而相对更低。只有四道题，题目本身的难易和你对它们的了解程度，都会让结果大幅波动。' : '这一次，两类题目上的估计相差不大，看不出明显的锚定方向。你可能对这些题目比较熟悉，熟悉的问题受锚定的影响通常较小。'}</p>
        <p>这里的“平均”是按比例计算的（几何平均），所以不同单位的题目可以放在一起比较。研究中，锚定效应是比较两组人得到的：一组看到高的数字，另一组看到低的数字，比较两组估计的平均差别；一个人四道题的结果，不能说明你“容易”或“不容易”被锚定。</p>`;
    };
    action(actions, '开始', begin);
    stage.innerHTML = '<p class="lab-q">点“开始”。一共四个问题，大约两分钟。</p>';
  }

  /* 08-02 · prospect theory curves: v(x) = x^α for gains, −λ(−x)^α for losses (Tversky & Kahneman's
     functional form), and Prelec's probability weighting w(p) = exp(−(−ln p)^γ). Parameters are illustrative. */
  function prospect(host) {
    const o = { view: 'value' };
    const { fig, out, actions } = shell(host, '价值函数与概率权重',
      '拖动滑块，改变曲线的形状。横轴上的金额是假设的。你也可以切换到概率权重函数，看看人们对概率的感受怎样偏离实际的概率。',
      [['view', '显示', [['value', '价值函数'], ['weight', '概率权重函数']]]],
      '这是一个模型演示，曲线由公式计算出来，不是任何人的真实偏好。默认参数取自常被引用的估计（损失厌恶系数 2.25、曲率 0.88，概率权重参数 0.65），只用来作参照；真实研究中，这些参数因人、因任务而有很大差别。', MODEL);
    const box = document.createElement('div');
    const sL = slider('损失厌恶系数 λ：', 1, 3, 0.05, 2.25), sA = slider('曲率 α（1 表示直线）：', 0.5, 1, 0.02, 0.88), sG = slider('概率权重参数 γ（1 表示与实际概率相同）：', 0.3, 1, 0.01, 0.65);
    fig.append(box, sL.box, sA.box, sG.box);
    [sL, sA, sG].forEach((s) => s.input.addEventListener('input', () => draw()));
    const v = (x, l, a) => (x >= 0 ? Math.pow(x, a) : -l * Math.pow(-x, a));
    const wP = (p, g) => (p <= 0 ? 0 : p >= 1 ? 1 : Math.exp(-Math.pow(-Math.log(p), g)));
    const draw = () => {
      const l = Number(sL.input.value), a = Number(sA.input.value), g = Number(sG.input.value);
      sL.val.textContent = ' ' + fmt(l, 2); sA.val.textContent = ' ' + fmt(a, 2); sG.val.textContent = ' ' + fmt(g, 2);
      sL.input.setAttribute('aria-valuetext', fmt(l, 2)); sA.input.setAttribute('aria-valuetext', fmt(a, 2)); sG.input.setAttribute('aria-valuetext', fmt(g, 2));
      const val = o.view === 'value';
      sL.box.hidden = !val; sA.box.hidden = !val; sG.box.hidden = val;
      const W = widthOf(fig), H = 300;
      box.innerHTML = '';
      if (val) {
        const M = 100, top = v(M, l, a), yMax = Math.max(top, -v(-M, l, a)) * 1.05;
        const L0 = 16, R0 = 16, T = 26, Bm = 30, cx = L0 + (W - L0 - R0) / 2, cy = T + (H - T - Bm) / 2;
        const X = (x) => cx + (x / M) * ((W - L0 - R0) / 2), Y = (y) => cy - (y / yMax) * ((H - T - Bm) / 2);
        const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `价值函数：得到 100 元的主观价值约为 ${fmt(top, 0)}，失去 100 元约为负 ${fmt(-v(-M, l, a), 0)}。` }, box);
        el('line', { x1: L0, x2: W - R0, y1: cy, y2: cy, class: 'lab-axis' }, svg);
        el('line', { x1: cx, x2: cx, y1: T - 8, y2: H - Bm + 4, class: 'lab-axis' }, svg);
        const pts = []; for (let i = -100; i <= 100; i += 2) pts.push([X(i), Y(v(i, l, a))]);
        line(svg, pts, 'fx-ln fx-lr fx-curve');
        [[M, top], [-M, v(-M, l, a)]].forEach(([x, y]) => { el('line', { x1: X(x), x2: X(x), y1: cy, y2: Y(y), class: 'fx-hair fx-dash' }, svg); el('circle', { cx: X(x), cy: Y(y), r: 4.5, class: 'fx-node r' }, svg); });
        text(svg, W - R0, cy - 8, '得到（元）', 'lab-tick', 'end'); text(svg, L0, cy + 18, '失去（元）', 'lab-tick');
        text(svg, X(M), cy + 18, '+100', 'lab-tick', 'middle'); text(svg, X(-M), cy - 8, '−100', 'lab-tick', 'middle');
        text(svg, cx + 6, T - 10, '主观价值', 'lab-tick'); text(svg, cx + 6, H - Bm + 18, '参照点', 'lab-tick');
        const need = 100 * Math.pow(l, 1 / a);
        out.innerHTML = `<ul class="lab-parts"><li><span>得到 100 元的主观价值</span><b>${fmt(top, 1)}</b></li><li><span>失去 100 元的主观价值</span><b>−${fmt(-v(-M, l, a), 1)}</b></li><li><span>一半机会赢 100、一半机会输 100 的赌局，在模型中的总价值</span><b>${fmt(0.5 * top + 0.5 * v(-M, l, a), 1)}</b></li><li><span>输 100 元的抛硬币游戏，赢多少才“值得”（模型推算）</span><b>${nf(need)} 元</b></li></ul>
          <p>${l > 1.02 ? `失去一侧比得到一侧更陡，所以输赢相同的赌局在模型中总价值为负：按照这组参数，要赢大约 ${nf(need)} 元才抵得上输 100 元。` : '损失厌恶系数接近 1 时，失去和得到一样重，输赢相同的赌局在模型中大约不赚不赔。'}${a < 0.99 ? '曲率小于 1 时，两侧的曲线都越来越平：第一个 100 元最有感觉，之后增加的部分感受越来越弱。' : '曲率为 1 时，两侧都是直线，主观价值与金额成正比。'}</p>
          <p>这里没有包含概率权重，所以赌局的价值只是两种结果价值的简单平均。这些数字只说明模型的含义，不能用来预测某个人的选择。</p>`;
      } else {
        const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `概率权重函数：1% 的概率被赋予约 ${fmt(wP(0.01, g) * 100, 1)}% 的权重，99% 的概率被赋予约 ${fmt(wP(0.99, g) * 100, 1)}% 的权重。` }, box);
        const { X, Y } = lc(svg, W, H, { xMax: 100, yMax: 100, xTicks: [0, 25, 50, 75, 100], yTicks: [[0, '0'], [50, '50'], [100, '100']], xLab: '实际概率（%）', yLab: '决策权重（%）' });
        el('line', { x1: X(0), y1: Y(0), x2: X(100), y2: Y(100), class: 'fx-hair fx-dash' }, svg);
        const pts = []; for (let i = 0; i <= 200; i++) { const p = i / 200; pts.push([X(p * 100), Y(wP(p, g) * 100)]); }
        line(svg, pts, 'fx-ln fx-lr fx-curve');
        [0.01, 0.5, 0.99].forEach((p) => el('circle', { cx: X(p * 100), cy: Y(wP(p, g) * 100), r: 4.5, class: 'fx-node r' }, svg));
        text(svg, X(100), Y(8), '虚线：决策权重 = 实际概率', 'lab-tick fx-halo', 'end');
        out.innerHTML = `<ul class="lab-parts"><li><span>实际概率 1%，模型中的决策权重</span><b>${fmt(wP(0.01, g) * 100, 1)}%</b></li><li><span>实际概率 50%</span><b>${fmt(wP(0.5, g) * 100, 1)}%</b></li><li><span>实际概率 99%</span><b>${fmt(wP(0.99, g) * 100, 1)}%</b></li></ul>
          <p>${g < 0.98 ? '曲线在左下方高于虚线、在右上方低于虚线：小概率被放大，大概率被缩小；从 99% 到 100% 的变化，在感受上比从 50% 到 51% 大得多。这可以解释同一个人为什么既买彩票又买保险。' : 'γ 接近 1 时，曲线几乎与虚线重合，决策权重就等于实际概率，这正是期望效用理论的假定。'}</p>
          <p>这条曲线描述的是人们“根据描述作决策”时的平均模式；在根据亲身经验作决策时，罕见事件常常反而被低估。</p>`;
      }
    };
    bindControls(host, o, draw);
    action(actions, '恢复默认参数', () => { sL.input.value = 2.25; sA.input.value = 0.88; sG.input.value = 0.65; draw(); }, 'lab-clear');
    draw();
    onResize(draw);
  }

  /* 08-02 · framing: two problems, each answered in one frame first and in the other frame afterwards */
  const FRAMES = [
    { k: 'disease', t: '一种罕见的疾病预计会导致 600 人死亡。有两种应对方案，你选择哪一种？',
      g: ['方案 A：200 人会被救活。', '方案 B：有 1/3 的可能 600 人都被救活，2/3 的可能没有人被救活。'],
      l: ['方案 C：400 人会死亡。', '方案 D：有 1/3 的可能没有人死亡，2/3 的可能 600 人都会死亡。'],
      same: '方案 A 和方案 C 的结果相同：200 人活，400 人死；方案 B 和方案 D 的结果也相同。' },
    { k: 'money', t: '',
      tg: '假设你已经得到 1000 元。现在请在下面两者中选一个：', tl: '假设你已经得到 2000 元。现在请在下面两者中选一个：',
      g: ['确定再得到 500 元。', '一半的可能再得到 1000 元，一半的可能什么也不再得到。'],
      l: ['确定失去 500 元。', '一半的可能失去 1000 元，一半的可能什么也不失去。'],
      same: '把开头给的钱算进去，两道题的最终结果完全相同：确定的选项最后都是 1500 元；冒险的选项最后都是一半可能 2000 元、一半可能 1000 元。' },
  ];
  function frame(host) {
    const { fig, out, actions } = shell(host, '同样的选择，两种说法',
      '先回答两道选择题。随后你会看到同样的两道题换了一种说法，请再按当时的直觉回答一次。没有对错之分。',
      [], '这是一个教学演示，题目中的人数和金额都是假设的。研究中的框架效应，通常是比较两组分别只看到一种说法的人；一个人先后回答两种说法时，常常会注意到它们是同一个问题，效应因此会变小。你的回答只保存在这个页面里。', TASK);
    host.querySelector('.lab-ctrls').remove();
    const stage = document.createElement('div'); stage.className = 'lab-mis';
    const ctl = document.createElement('div'); ctl.className = 'lab-resp';
    fig.append(stage, ctl);
    let seq = [], k = 0, ans = {};
    const begin = () => {
      const f = Math.random() < 0.5 ? ['g', 'l'] : ['l', 'g'];
      seq = [[0, f[0]], [1, f[1]], [0, f[1]], [1, f[0]]]; k = 0; ans = {}; out.innerHTML = ''; ask();
    };
    const ask = () => {
      const [i, fr] = seq[k], P = FRAMES[i], opts = P[fr];
      stage.innerHTML = `<p class="lab-k">第 ${k + 1} 题 / 共 4 题${k === 2 ? '（以下是换了说法的两道题）' : ''}</p><p class="lab-q">${P.t || (fr === 'g' ? P.tg : P.tl)}</p>`;
      ctl.innerHTML = '';
      opts.forEach((t, j) => { const b = action(ctl, t, () => { ans[`${i}${fr}`] = j; k++; if (k < seq.length) ask(); else reveal(); }); b.classList.add('lab-long'); });
      ctl.querySelector('button').focus();
    };
    const pick = (i, fr) => (ans[`${i}${fr}`] === 0 ? '确定的选项' : '冒险的选项');
    const reveal = () => {
      stage.innerHTML = FRAMES.map((P, i) => `<div class="lab-item"><p><b>${i === 0 ? '疾病问题' : '金钱问题'}</b></p><ul class="lab-parts lab-flow"><li><span>用“得到／救活”来描述时，你选了</span><b>${pick(i, 'g')}</b></li><li><span>用“失去／死亡”来描述时，你选了</span><b>${pick(i, 'l')}</b></li></ul><p class="lab-note">${P.same}</p></div>`).join('');
      ctl.innerHTML = ''; action(ctl, '重新开始', begin, 'lab-clear');
      const typical = [0, 1].filter((i) => ans[`${i}g`] === 0 && ans[`${i}l`] === 1).length;
      const flip = [0, 1].filter((i) => ans[`${i}g`] !== ans[`${i}l`]).length;
      out.innerHTML = `<p>在两道题中，你有 <b>${flip}</b> 道在换了说法之后改变了选择${typical ? `，其中 <b>${typical}</b> 道是研究中最常见的方向：用“得到”描述时选确定的选项，用“失去”描述时选冒险的选项` : ''}。</p>
        <p>${flip ? '两种说法的实际结果完全相同，变化的只是参照点：同样的结果，被说成“得到”还是“失去”，会让确定的选项显得更安全或更难以接受。' : '你在两种说法下作了同样的选择。这并不少见：当同一个人先后看到两种说法时，很容易发现它们是同一个问题，并有意识地保持一致。'}</p>
        <p>经典研究中，看到“救活”说法的一组人，大多选择确定的方案；看到“死亡”说法的另一组人，大多选择冒险的方案。元分析发现，这类效应总体上是小到中等的，大小取决于题目和实验设计。</p>`;
    };
    action(actions, '开始', begin);
    stage.innerHTML = '<p class="lab-q">点“开始”。一共四道选择题。</p>';
  }

  /* 08-03 · sunk cost: a hypothetical project. Continue if p × benefit − remaining cost > salvage value.
     The money already spent is shown, but it is the same under both choices. */
  function sunk(host) {
    const { fig, out, actions } = shell(host, '继续，还是放弃？',
      '一家公司在一个新产品项目上已经投入了一笔钱。现在需要决定：继续投入把它做完，还是停下来。拖动滑块改变各项数字（单位：万元），看看建议怎样变化。',
      [], '这是一个简化的教学模型，所有数字都是假设的，只比较金钱上的期望值。真实的决定还要考虑风险、新的信息、团队学到的东西、名誉和其他机会；这个模型不能预测任何人或任何公司的实际选择。', MODEL);
    host.querySelector('.lab-ctrls').remove();
    const box = document.createElement('div');
    const S = [slider('已经花掉的钱：', 0, 300, 10, 150), slider('做完还需要投入：', 10, 200, 10, 80), slider('做完后的收益：', 0, 400, 10, 160), slider('做完后获得这份收益的可能性：', 10, 100, 5, 60), slider('现在放弃时，设备等能卖回的钱：', 0, 60, 5, 10)];
    const U = [' 万元', ' 万元', ' 万元', '%', ' 万元'];
    fig.append(box, ...S.map((s) => s.box));
    S.forEach((s) => s.input.addEventListener('input', () => draw()));
    const draw = () => {
      const [sk, rem, ben, p, sal] = S.map((s) => Number(s.input.value));
      S.forEach((s, i) => { s.val.textContent = ' ' + s.input.value + U[i]; s.input.setAttribute('aria-valuetext', s.input.value + U[i]); });
      const cont = (p / 100) * ben - rem, stop = sal, go = cont > stop;
      const W = widthOf(fig), H = 206, L0 = 16, R0 = 56;
      const lo = Math.min(-sk, cont, 0), hi = Math.max(cont, stop, 10), X = (x) => L0 + ((x - lo) / (hi - lo)) * (W - L0 - R0);
      box.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `继续的将来净收益 ${nf(cont)} 万元，放弃能收回 ${nf(stop)} 万元；已经花掉的 ${sk} 万元在两种选择下都一样。` }, box);
      const rows = [['已经花掉：两种选择下都一样，拿不回来', -sk, 'fx-band2', 40], ['继续：将来的期望净收益', cont, go ? 'lab-bar b' : 'lab-bar', 118], ['放弃：现在能收回的钱', stop, go ? 'lab-bar' : 'lab-bar b', 176]];
      el('line', { x1: X(0), x2: X(0), y1: 6, y2: H - 4, class: 'lab-axis' }, svg);
      el('line', { x1: 0, x2: W, y1: 72, y2: 72, class: 'fx-hair fx-dash' }, svg);
      rows.forEach(([t, v, cls, y]) => {
        const x1 = X(Math.min(0, v)), x2 = X(Math.max(0, v));
        text(svg, 0, y - 18, t, 'lab-tick');
        el('rect', { x: x1, y: y - 10, width: Math.max(1, x2 - x1), height: 18, class: cls }, svg);
        text(svg, x2 + 6, y + 4, (v > 0 ? '+' : v < 0 ? '−' : '') + nf(Math.abs(v)), 'lab-tick fx-halo');
      });
      out.innerHTML = `<p>按照这个模型，<b>${go ? '继续' : '放弃'}</b>更划算：继续下去，将来的期望净收益是 ${fmt(p / 100, 2)} × ${ben} − ${rem} = <b>${nf(cont)}</b> 万元；现在放弃，能收回 <b>${nf(stop)}</b> 万元。</p>
        <p>拖动第一个滑块试试：不论已经花掉 0 万元还是 300 万元，建议都不会改变。已经花掉的钱，在继续和放弃两种选择下都已经花掉了；如果把它从两边同时减去，两者的差别仍然一样。“已经投了 ${sk} 万，现在放弃就全白费了”，说的是过去，而不是将来。</p>
        <p>会改变建议的，是后面四个数字：还要投入多少、做完能得到什么、有多大把握，以及放弃时能收回什么。新的信息改变了这些数字时，继续或放弃的理由才真正改变。</p>
        <p>这里的建议是一条规范性的规则：它说明“只看将来”时应该怎样比较，并不描述人们实际会怎样做。研究发现，真实的人常常会受到已经花掉的钱的影响。${go ? '在这组数字下，继续是合理的，理由是将来的收益大于放弃时能收回的钱，而不是已经花掉的钱。' : '如果将来的期望收益变得更大，继续就会成为合理的选择；那时的理由同样来自将来，而不是过去。'}</p>`;
    };
    action(actions, '恢复默认数字', () => { [150, 80, 160, 60, 10].forEach((v, i) => { S[i].input.value = v; }); draw(); }, 'lab-clear');
    draw();
    onResize(draw);
  }

  /* 08-03 · discounting: 100 now-ish versus a larger amount later, both pushed into the future by a front delay.
     Exponential V = A·exp(−r·d); hyperbolic V = A / (1 + k·d); quasi-hyperbolic V = A for d = 0, else β·δ^d·A. */
  const KH = 0.15, RE = 0.04, BETA = 0.7, DELTA = 0.99;
  function discount(host) {
    const o = { model: 'hyp' };
    const { fig, out, actions } = shell(host, '现在的 100 元，还是以后的更多？',
      '两个假设的选项：较小的 100 元，和晚一些才能拿到的较大金额。拖动“两个选项都推迟”的滑块，相当于从更远的地方看这个选择；比较不同的折扣模型怎样预测你的偏好。',
      [['model', '折扣模型', [['exp', '指数折扣'], ['hyp', '双曲折扣'], ['qh', '现时偏差（准双曲）']]]],
      `这是一个模型演示。三个模型的参数都是为了说明原理而设定的（指数：每月 ${RE * 100}%；双曲：k = ${KH}；准双曲：β = ${BETA}、δ = ${DELTA}），不代表任何人的真实偏好，也不能用来预测你的财务行为。`, MODEL);
    const box = document.createElement('div');
    const sB = slider('较大金额：', 110, 250, 5, 150), sG = slider('较大金额要多等：', 1, 12, 1, 6), sD = slider('两个选项都推迟：', 0, 24, 1, 0);
    fig.append(box, sB.box, sG.box, sD.box);
    [sB, sG, sD].forEach((s) => s.input.addEventListener('input', () => draw()));
    const V = (A, d) => (o.model === 'exp' ? A * Math.exp(-RE * d) : o.model === 'hyp' ? A / (1 + KH * d) : d === 0 ? A : A * BETA * Math.pow(DELTA, d));
    const draw = () => {
      const big = Number(sB.input.value), gap = Number(sG.input.value), d0 = Number(sD.input.value);
      sB.val.textContent = ` ${big} 元`; sG.val.textContent = ` ${gap} 个月`; sD.val.textContent = d0 ? ` ${d0} 个月` : ' 不推迟（较小的那份马上就能拿）';
      sB.input.setAttribute('aria-valuetext', `${big} 元`); sG.input.setAttribute('aria-valuetext', `${gap} 个月`); sD.input.setAttribute('aria-valuetext', `${d0} 个月`);
      const W = widthOf(fig), H = 270, M = 24;
      box.innerHTML = '';
      const ss = (d) => V(100, d), ll = (d) => V(big, d + gap);
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `推迟 ${d0} 个月时，100 元的现值约 ${fmt(ss(d0), 0)}，${big} 元的现值约 ${fmt(ll(d0), 0)}。` }, box);
      const top = tidy(Math.max(ss(0), ll(0)) * 1.05, 25);
      const { X, Y } = lc(svg, W, H, { xMax: M, yMax: top, xTicks: [0, 6, 12, 18, 24], yTicks: ticksTo(top, top > 100 ? 50 : 25).map((t) => [t, String(t)]), xLab: '两个选项都推迟（月）', yLab: '在此刻看来的价值（元）' });
      const p1 = [], p2 = []; for (let d = 0; d <= M; d += 0.25) { p1.push([X(d), Y(ss(d))]); p2.push([X(d), Y(ll(d))]); }
      if (o.model === 'qh') { p1.splice(1, 0, [X(0.0001), Y(ss(0.0001))]); }
      line(svg, p1, 'fx-ln fx-lb fx-curve'); line(svg, p2, 'fx-ln fx-lr fx-curve');
      el('line', { x1: X(d0), x2: X(d0), y1: 24, y2: Y(0), class: 'fx-hair fx-dash' }, svg);
      el('circle', { cx: X(d0), cy: Y(ss(d0)), r: 4.5, class: 'fx-node b' }, svg); el('circle', { cx: X(d0), cy: Y(ll(d0)), r: 4.5, class: 'fx-node r' }, svg);
      let cross = null; for (let d = 0; d <= M; d += 0.25) { if ((ss(d) > ll(d)) !== (ss(0) > ll(0))) { cross = d; break; } }
      const now = ss(d0) > ll(d0);
      out.innerHTML = `<p class="fx-keys"><span><i class="k" style="background:var(--blue)"></i>100 元</span><span><i class="k" style="background:var(--red)"></i>${big} 元（再多等 ${gap} 个月）</span></p>
        <ul class="lab-parts"><li><span>此刻看来，100 元值</span><b>${fmt(ss(d0), 1)} 元</b></li><li><span>此刻看来，${big} 元值</span><b>${fmt(ll(d0), 1)} 元</b></li><li><span>模型预测的选择</span><b>${now ? '100 元' : `${big} 元`}</b></li></ul>
        <p>${o.model === 'exp' ? '在指数模型中，两条曲线按同样的比例下降，永远不会交叉：无论从多远的地方看，偏好都一样。' : cross !== null ? `两条曲线在推迟约 ${fmt(cross, cross % 1 ? 1 : 0)} 个月处交叉：从远处看，模型更喜欢较大、较晚的回报；当较小的回报近在眼前时，偏好就反转了。${o.model === 'qh' ? '在现时偏差模型中，反转只发生在“现在”这一刻：只要两个选项都在将来，“现在”的额外折扣就不起作用。' : ''}` : '在这组数字下，两条曲线没有交叉，偏好不会反转。试着调整较大金额或等待时间。'}</p>
        <p>这些曲线说明的是模型的性质，不是对你的预测。真实的选择还取决于你是否相信将来真能拿到钱、此刻是否急需用钱，以及回报是金钱还是需要付出努力的事情。</p>`;
    };
    bindControls(host, o, draw);
    action(actions, '恢复默认设置', () => { o.model = 'hyp'; sB.input.value = 150; sG.input.value = 6; sD.input.value = 0; host.querySelectorAll('.lab-opts .choice').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === o[b.dataset.k]))); draw(); }, 'lab-clear');
    draw();
    onResize(draw);
  }

  /* 08-04 · calibration: ten two-choice questions, each with a confidence rating; then confidence against accuracy */
  const CAL = [
    ['哪座城市更靠北（纬度更高）？', '罗马', '北京', '罗马约在北纬 41.9°，北京约在北纬 39.9°。'],
    ['哪个国家的国土面积更大？', '加拿大', '中国', '加拿大约 998 万平方公里，中国约 960 万平方公里。'],
    ['哪件事发生得更早？', '郑和第一次下西洋', '哥伦布到达美洲', '郑和第一次下西洋在 1405 年，哥伦布到达美洲在 1492 年。'],
    ['哪座山更高？', '乞力马扎罗山', '勃朗峰', '乞力马扎罗山约 5895 米，勃朗峰约 4806 米。'],
    ['哪种元素的原子序数更大？', '铜', '铁', '铜是 29 号元素，铁是 26 号元素。'],
    ['哪座城市更靠南？', '墨尔本', '开普敦', '墨尔本约在南纬 37.8°，开普敦约在南纬 33.9°。'],
    ['哪个大洋的面积更大？', '大西洋', '印度洋', '大西洋是第二大洋，面积大于印度洋。'],
    ['哪座城市更靠西？', '乌鲁木齐', '拉萨', '乌鲁木齐约在东经 87.6°，拉萨约在东经 91.1°。'],
    ['哪件事发生得更早？', '唐朝建立', '伊斯兰历纪元开始', '唐朝建立于 618 年，伊斯兰历以 622 年为元年。'],
    ['哪颗行星离太阳更近？', '金星', '火星', '金星是离太阳第二近的行星，火星是第四近。'],
  ];
  const CONFS = [50, 60, 70, 80, 90, 100];
  function calib(host) {
    const { fig, out, actions } = shell(host, '你的信心和你的准确率相符吗？',
      '下面有十道二选一的常识题。每道题先选一个答案，再选择你有多大把握答对：50% 表示完全是猜的，100% 表示绝对确定。',
      [], '这是一个教学练习，不是智力测验或人格测验。十道题太少，一个人的结果受偶然因素影响很大；题目是为演示挑选的，其中几道故意容易误导人，这本身就会让人显得过度自信。你的回答只保存在这个页面里。', TASK);
    host.querySelector('.lab-ctrls').remove();
    const stage = document.createElement('div'); stage.className = 'lab-mis';
    const ctl = document.createElement('div'); ctl.className = 'lab-resp';
    const status = document.createElement('p'); status.className = 'lab-status'; status.setAttribute('aria-live', 'polite');
    fig.append(stage, ctl, status);
    let qs = [], ans = [];
    const begin = () => {
      qs = shuffle(CAL.map(([q, a, b, why]) => { const sw = Math.random() < 0.5; return { q, o: sw ? [b, a] : [a, b], right: sw ? 1 : 0, why }; }));
      ans = qs.map(() => ({})); out.innerHTML = '';
      stage.innerHTML = qs.map((x, i) => `
        <div class="lab-item" role="group" aria-label="第 ${i + 1} 题：${x.q}"><p>${i + 1}. ${x.q}</p>
          <div class="lab-opts" data-i="${i}">${x.o.map((t, j) => `<button type="button" class="choice" data-a="${j}" aria-pressed="false">${t}</button>`).join('')}
          <span class="lab-conf" role="group" aria-label="把握">${CONFS.map((c) => `<button type="button" class="choice" data-c="${c}" aria-pressed="false">${c}%</button>`).join('')}</span></div></div>`).join('');
      stage.querySelectorAll('.lab-opts').forEach((g) => g.addEventListener('click', (e) => {
        const b = e.target.closest('.choice'); if (!b) return;
        const a = ans[Number(g.dataset.i)];
        if (b.dataset.a !== undefined) { a.a = Number(b.dataset.a); g.querySelectorAll('[data-a]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }
        else { a.c = Number(b.dataset.c); g.querySelectorAll('[data-c]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }
        const done = ans.filter((x) => x.a !== undefined && x.c !== undefined).length;
        fin.disabled = done < qs.length; status.textContent = `已完成 ${done} / ${qs.length} 题。`;
      }));
      ctl.innerHTML = '';
      const fin = action(ctl, '看结果', reveal); fin.disabled = true;
      status.textContent = `已完成 0 / ${qs.length} 题。`;
      stage.querySelector('.choice').focus();
    };
    const reveal = () => {
      const ok = qs.map((x, i) => ans[i].a === x.right);
      const nOk = ok.filter(Boolean).length, mc = ans.reduce((s, a) => s + a.c, 0) / qs.length, acc = (nOk / qs.length) * 100;
      const bins = [[50, 60], [70, 80], [90, 100]].map(([a, b]) => { const ix = qs.map((_, i) => i).filter((i) => ans[i].c === a || ans[i].c === b); return { lab: `${a}%–${b}%`, n: ix.length, conf: ix.length ? ix.reduce((s, i) => s + ans[i].c, 0) / ix.length : 0, acc: ix.length ? (ix.filter((i) => ok[i]).length / ix.length) * 100 : 0 }; });
      stage.innerHTML = `<div class="l-table" role="region" tabindex="0" aria-label="逐题结果"><table><thead><tr><th>题目</th><th class="lab-nw">你的答案</th><th class="lab-nw">把握</th></tr></thead><tbody>${qs.map((x, i) => `<tr><td>${x.q}<br><span class="lab-k">${x.why}</span></td><td class="lab-nw">${x.o[ans[i].a]}${ok[i] ? '' : ' <b class="lab-wrong">✕</b>'}</td><td class="lab-nw">${ans[i].c}%</td></tr>`).join('')}</tbody></table></div><div class="lab-cal"></div>`;
      const box = stage.querySelector('.lab-cal');
      const W = widthOf(fig), H = 260, svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `校准图：${bins.filter((b) => b.n).map((b) => `把握 ${b.lab} 的 ${b.n} 道题，答对 ${fmt(b.acc, 0)}%`).join('；')}。` }, box);
      const L = 40, R = 30, T = 30, Bt = 40, X = (v) => L + ((v - 50) / 50) * (W - L - R), Y = (v) => H - Bt - (v / 100) * (H - T - Bt);
      [50, 100].forEach((v) => el('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: 'fx-hair fx-dash' }, svg));
      el('line', { x1: L, x2: W - R, y1: Y(0), y2: Y(0), class: 'lab-axis' }, svg); el('line', { x1: L, x2: L, y1: T - 6, y2: Y(0), class: 'lab-axis' }, svg);
      [50, 100].forEach((v) => text(svg, L - 6, Y(v) + 4, String(v), 'lab-tick', 'end'));
      [50, 60, 70, 80, 90, 100].forEach((v) => text(svg, X(v), H - Bt + 17, String(v), 'lab-tick', 'middle'));
      text(svg, 0, 13, '实际答对（%）', 'lab-tick'); text(svg, W - R, H - 4, '你的把握（%）', 'lab-tick', 'end');
      el('line', { x1: X(50), y1: Y(50), x2: X(100), y2: Y(100), class: 'fx-hair fx-dash' }, svg);
      text(svg, X(52), Y(56) - 4, '完全校准', 'lab-tick fx-halo');
      bins.filter((b) => b.n).forEach((b) => { el('circle', { cx: X(b.conf), cy: Y(b.acc), r: 4 + b.n * 1.2, class: 'fx-node r' }, svg); text(svg, X(b.conf) + (b.conf > 85 ? -(10 + b.n) : 10 + b.n), b.acc < 20 ? Y(b.acc) - 8 : Y(b.acc) + 4, `${b.n} 题`, 'lab-tick fx-halo', b.conf > 85 ? 'end' : 'start'); });
      ctl.innerHTML = ''; action(ctl, '重新开始', begin, 'lab-clear');
      status.textContent = '';
      const gap = mc - acc;
      out.innerHTML = `<ul class="lab-parts"><li><span>你的平均把握</span><b>${fmt(mc, 0)}%</b></li><li><span>你实际答对的比例</span><b>${fmt(acc, 0)}%</b></li>${bins.filter((b) => b.n).map((b) => `<li><span>把握 ${b.lab} 的题目（${b.n} 道）实际答对</span><b>${fmt(b.acc, 0)}%</b></li>`).join('')}</ul>
        <p>${gap > 10 ? `你的平均把握比实际正确率高出约 ${fmt(gap, 0)} 个百分点，方向上属于过度自信。` : gap < -10 ? `你的平均把握比实际正确率低约 ${fmt(-gap, 0)} 个百分点，方向上属于信心不足。` : '你的平均把握与实际正确率相差不到 10 个百分点，在这十道题上大致相符。'}图中每个圆点代表一组把握相近的题目：点落在虚线下方，说明这组题的实际正确率低于你的把握；落在上方，说明你比自己以为的答得更好。</p>
        <p>这几道题中，有一些是常见的“陷阱”（比如很多人以为北京比罗马更靠北），研究者指出，这类特意挑选的题目会让人显得更过度自信。如果题目是从真实环境中随机抽取的，结果可能不同。要真正了解自己的校准程度，需要在大量判断上记录把握，并在事后核对结果，就像天气预报员做的那样。</p>`;
    };
    action(actions, '开始', begin);
    stage.innerHTML = '<p class="lab-q">点“开始”。一共十道题，大约三分钟。</p>';
  }

  /* =====================================================================
     Stage 09 · emotion, stress and well-being. One scenario explorer and one
     illustrative model. Neither is an assessment; both say so on screen.
     ===================================================================== */

  /* 09-02 · emotion regulation: three hypothetical situations × seven strategies, placed on Gross's process model.
     The readout summarizes average research findings; it does not predict what would happen to the reader. */
  const RSCEN = {
    exam: ['下周有一场重要的考试，你很紧张。', '这个情境在很大程度上是可以控制的：准备得越充分，结果越可能改变。'],
    wait: ['一份重要的申请已经交上去了，结果要两周后才知道。', '这个情境基本无法控制：现在做什么都不会改变结果。'],
    tease: ['聚会上，一位朋友当众开了一个让你难堪的玩笑。', '这是一个社会情境：你的反应会被别人看到，也会影响你们的关系。'],
  };
  const STAGES = ['情境', '注意', '评价', '反应'];
  const RSTRAT = {
    sel: ['避开这个情境', 0, '情境选择', '事先选择进入或避开某个情境。短期内能有效地减少不愉快的情绪；但如果长期、广泛地回避，也会失去机会，并且使人没有机会发现，自己担心的事情其实能够应付。',
      { exam: '考试本身很难避开；如果“回避”变成不去复习、不去想，短期轻松，长期可能更糟。', wait: '结果无法回避，但可以避开那些让你不断去查看、比较的情境。', tease: '可以提前离开，但这可能被别人误解，问题本身也没有解决。' }],
    mod: ['动手改变情境', 0, '情境修正', '直接改变情境本身，也就是解决问题。当情境可以改变时，这往往是最直接的办法；当情境无法改变时，强求改变反而会增加挫败感。',
      { exam: '制定复习计划、找同学讨论，都在改变“准备不足”这个情境本身。在可以控制的情境中，这类做法通常很合适。', wait: '结果已经无法改变，能修正的部分很少。', tease: '可以用一句轻松的话把话题带开，或者事后私下告诉朋友你的感受。' }],
    dis: ['把注意力转到别处', 1, '注意分配', '把注意力从引起情绪的事情上移开，比如去做别的事。元分析发现，分心在短期内能减轻不愉快的情绪；在情绪很强烈时，人们也更倾向于选择分心。但它不改变事情的意义，事后情绪可能再回来。',
      { exam: '短暂休息有帮助；但如果分心代替了复习，焦虑的来源仍在。', wait: '在一件无法控制、只能等待的事情上，分心常常是合理的选择。', tease: '在当场转移注意，可以避免情绪失控；事后是否需要处理，取决于这件事对你们关系的意义。' }],
    rum: ['反复想这件事', 1, '注意分配', '把注意力反复集中在不愉快的感受及其原因和后果上，也就是反刍。研究发现，反刍往往使不愉快的情绪持续更久。但并非所有反复的思考都有害：具体地想“下一步该怎么做”，与抽象地反复追问“为什么偏偏是我”，效果很不相同。',
      { exam: '具体地想“哪些章节还不熟”有助于准备；反复想“考砸了怎么办”则多半只会增加焦虑。', wait: '在无法改变结果的事情上反复思考，很少带来新的信息。', tease: '反复回放当时的场景，常常让人越想越生气或越难堪。' }],
    rea: ['换一个角度理解', 2, '认知改变', '改变对情境意义的评价，即重新评价，比如把紧张理解为身体在为挑战做准备。实验室研究发现，它通常能减轻不愉快的体验，而不像压抑表情那样增加生理负担。但它需要认知资源，在情绪非常强烈时较难使用；它的效果也取决于情境。',
      { exam: '把紧张看作“在乎这件事”的信号是有帮助的；但如果用“其实不重要”来说服自己，可能减少准备的动力。在可以控制的情境中，重新评价并不总是比解决问题更好。', wait: '一项研究发现，在难以控制的压力情境中，善于重新评价的人抑郁症状较少；而在可以控制的情境中，情况相反。', tease: '“他可能只是想活跃气氛”这样的解释能减轻怒气；但如果对方确实有意冒犯，一味地往好处想也可能让问题反复发生。' }],
    acc: ['接受这种感受', 3, '接受', '不评判、也不试图消除当下的情绪，允许它存在。实验研究的元分析发现，接受的效果至少不比其他调节方式差，在忍受疼痛方面还略有优势；习惯于接受自己消极情绪的人，心理健康状况往往较好，但这类研究多是相关研究。它在过程模型中的位置有争议，这里把它放在反应阶段，只是一种简化。',
      { exam: '接受紧张，并不意味着放弃准备；接受和解决问题可以同时进行。', wait: '对无法改变的等待，接受常常是合适的选择。', tease: '接受自己的难堪和不快，不等于认同对方的做法。' }],
    sup: ['压住，不表现出来', 3, '反应调节', '在情绪已经产生之后，抑制表情和行为，即表达抑制。实验发现，它能减少外在的表情，却不太能减轻内在的体验，还可能增加生理唤醒、占用记忆资源，并影响交谈对象的感受。但它的后果因文化和情境而不同：在某些场合，暂时不表露情绪是恰当的。',
      { exam: '在考场上压住紧张的表情没有坏处，但它不会让人更不紧张。', wait: '独自等待时，压抑表情的意义不大。', tease: '在众人面前暂时不发作，常常是合乎情境的选择；但如果长期在亲密关系中压抑，研究发现可能损害彼此的亲近感。' }],
  };
  function regulate(host) {
    const o = { scen: 'exam', strat: 'rea' };
    const { fig, out } = shell(host, '同一种情绪，七种调节方式',
      '选一个情境，再选一种调节方式。图中会标出这种方式在情绪产生过程中的哪个环节起作用，下方汇总研究中的一般发现。',
      [['scen', '情境', [['exam', '考试前'], ['wait', '等待结果'], ['tease', '被当众取笑']]],
        ['strat', '调节方式', Object.entries(RSTRAT).map(([k, v]) => [k, v[0]])]],
      '这是一个教学演示。下面的说明概括的是研究中的平均趋势，不是对任何人的预测，也不是心理测评或治疗建议。同一种方式对不同的人、在不同的时刻，效果可能很不一样。', MODEL);
    const box = document.createElement('div'); fig.append(box);
    const draw = () => {
      const [lab, at, fam, gen, by] = RSTRAT[o.strat], [scen, ctx] = RSCEN[o.scen];
      const W = widthOf(fig), nar = W < 460, H = nar ? 146 : 128, gap = nar ? 12 : 22, bw = (W - gap * 3) / 4, by0 = nar ? 70 : 52, fy = nar ? 42 : 26;
      box.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `情绪产生过程：情境、注意、评价、反应。“${lab}”属于${fam}，作用在“${STAGES[at]}”环节。` }, box);
      text(svg, 0, 14, '情绪产生的过程（格罗斯的过程模型，简化）', 'lab-tick');
      STAGES.forEach((t, i) => {
        const x = i * (bw + gap), on = i === at;
        el('rect', { x: x + 1, y: by0, width: bw - 2, height: 40, rx: 6, class: on ? 'fx-pill r' : 'fx-pill b' }, svg);
        text(svg, x + bw / 2, by0 + 25, t, 'fx-h', 'middle');
        if (i) { el('line', { x1: x - gap + 3, x2: x - 4, y1: by0 + 20, y2: by0 + 20, class: 'fx-ln' }, svg); el('path', { d: `M${x - 3},${by0 + 20} l-6,-4 v8 z`, class: 'fx-node' }, svg); }
      });
      const cx = at * (bw + gap) + bw / 2;
      el('line', { x1: cx, x2: cx, y1: fy + 4, y2: by0 - 4, class: 'fx-ln fx-lr' }, svg);
      text(svg, Math.min(Math.max(cx, 40), W - 40), fy, fam, 'lab-tick fx-halo', 'middle');
      text(svg, W, H - 10, nar ? '箭头表示时间顺序' : '箭头表示时间顺序；反应又会改变情境', 'lab-tick', 'end');
      out.innerHTML = `<p class="lab-q">${scen}</p><p class="lab-note">${ctx}</p>
        <ul class="lab-parts lab-flow"><li><span>你选择的方式</span><b>${lab}</b></li><li><span>属于</span><b>${fam}</b></li></ul>
        <p><b>研究中的一般发现：</b>${gen}</p><p><b>在这个情境中：</b>${by[o.scen]}</p>
        <p class="lab-note">没有一种方式在所有情境中都最好。研究者越来越强调<b>灵活性</b>：能否根据情境的要求，选择并调整调节方式。</p>`;
    };
    bindControls(host, o, draw);
    draw();
    onResize(draw);
  }

  /* 09-04 · hedonic adaptation: life satisfaction (0–10) after an event at year 2.
     Mean path: base + d · (keep + (1 − keep) · 0.5^(months / half)). Individual paths scale d by a seeded factor. */
  const ADAPT = {
    win: ['意外得到一大笔钱', 0.8, 18, 70, '针对瑞典彩票中奖者的研究发现，中大奖的人在多年后对生活的总体满意度仍然较高；在日常的快乐和心理健康上，效应则要小得多。'],
    marry: ['结婚', 0.6, 12, 0, '长期追踪发现，平均而言，人们在结婚前后满意度略有上升，几年后回到接近原来的水平；但个人之间的差别很大，有些人长期上升，有些人下降。'],
    unemp: ['失业', -1.0, 24, 40, '长期追踪发现，失业后满意度明显下降，平均而言即使重新就业，也没有完全回到原来的水平。'],
    health: ['长期的健康问题', -1.2, 30, 70, '长期追踪发现，严重而持久的健康问题往往伴随满意度的持续下降，下降的程度与严重性有关。'],
  };
  function adapt(host) {
    const o = { ev: 'win', ind: 'off' };
    const { fig, out, actions } = shell(host, '事件发生之后：适应的模型',
      '选择一类生活事件，或者拖动滑块自己设定。曲线显示一个假设的人群对生活的总体满意度（0–10 分）在事件前后怎样变化。',
      [['ev', '事件', Object.entries(ADAPT).map(([k, v]) => [k, v[0]])], ['ind', '个人之间的差别', [['off', '只看平均'], ['on', '同时显示几个假设的人']]]],
      '这是一个模型演示。所有曲线都由公式计算出来，数值是假设的；预设只表示研究中观察到的大致方向，不是研究的真实数据，也不能预测任何人的感受。', MODEL);
    const box = document.createElement('div');
    const sD = slider('事件带来的初始变化：', -3, 3, 0.1, 0.8), sH = slider('适应一半所需的时间：', 3, 60, 3, 18), sK = slider('长期保留下来的变化：', 0, 100, 5, 70);
    fig.append(box, sD.box, sH.box, sK.box);
    [sD, sH, sK].forEach((s) => s.input.addEventListener('input', () => { o.ev = ''; sync(); draw(); }));
    const sync = () => host.querySelectorAll('.lab-opts .choice[data-k="ev"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === o.ev)));
    const BASE = 7, YRS = 8, T0 = 2, IND = [1.6, 1.25, 0.9, 0.55, 0.2, -0.4];
    const path = (d, half, keep, t) => (t < T0 ? BASE : BASE + d * (keep + (1 - keep) * Math.pow(0.5, ((t - T0) * 12) / half)));
    const draw = () => {
      const d = Number(sD.input.value), half = Number(sH.input.value), keep = Number(sK.input.value) / 100;
      sD.val.textContent = ` ${d > 0 ? '+' : d < 0 ? '−' : ''}${fmt(Math.abs(d), 1)} 分`; sH.val.textContent = ` ${half} 个月`; sK.val.textContent = ` ${sK.input.value}%`;
      sD.input.setAttribute('aria-valuetext', `${fmt(d, 1)} 分`); sH.input.setAttribute('aria-valuetext', `${half} 个月`); sK.input.setAttribute('aria-valuetext', `${sK.input.value}%`);
      const W = widthOf(fig), H = 250;
      box.innerHTML = '';
      const at = (t) => path(d, half, keep, t);
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `假设的平均满意度：事件前 ${BASE} 分，事件后一年约 ${fmt(at(T0 + 1), 1)} 分，五年后约 ${fmt(at(T0 + 5), 1)} 分。` }, box);
      const { X, Y } = lc(svg, W, H, { xMax: YRS, yMax: 10, xTicks: [0, 2, 4, 6, 8], yTicks: [0, 2, 4, 6, 8, 10].map((v) => [v, String(v)]), xLab: '年', yLab: '对生活的总体满意度（假设）' });
      el('line', { x1: X(T0), x2: X(T0), y1: 24, y2: Y(0), class: 'fx-hair fx-dash' }, svg);
      text(svg, X(T0) + 5, Y(0) - 8, '事件', 'lab-tick');
      el('line', { x1: X(0), x2: X(YRS), y1: Y(BASE), y2: Y(BASE), class: 'fx-hair fx-dash' }, svg);
      const pts = (f) => { const p = []; for (let t = 0; t <= YRS + 1e-9; t += 0.05) p.push([X(t), Y(Math.max(0, Math.min(10, f(t))))]); return p; };
      if (o.ind === 'on') IND.forEach((m, i) => line(svg, pts((t) => path(d * m, half * (0.6 + 0.16 * i), Math.min(1, keep * (1.3 - 0.12 * i)), t) + (i - 2.5) * 0.18), 'fx-hair'));
      line(svg, pts(at), 'fx-ln fx-lr fx-curve');
      const ev = ADAPT[o.ev];
      out.innerHTML = `<ul class="lab-parts"><li><span>事件前（假设的平均）</span><b>${BASE} 分</b></li><li><span>事件后一年</span><b>${fmt(at(T0 + 1), 1)} 分</b></li><li><span>事件后五年</span><b>${fmt(at(T0 + 5), 1)} 分</b></li></ul>
        <p>${ev ? `<b>${ev[0]}。</b>${ev[4]}` : '你正在使用自己设定的数字。'}</p>
        <p>${keep === 0 ? '“长期保留”为 0 时，曲线最终回到原来的水平，这就是“享乐适应”最强的形式。' : keep === 1 ? '“长期保留”为 100% 时，完全没有适应：变化一直维持。' : '适应往往是部分的：变化随时间减弱，但不一定完全消失。研究发现，不同事件的适应程度相差很大。'}${o.ind === 'on' ? '细线是几个假设的人：平均曲线相同，个人的反应却可以很不一样，甚至方向相反。' : ''}</p>`;
    };
    const preset = () => { const ev = ADAPT[o.ev]; if (!ev) return; sD.input.value = ev[1]; sH.input.value = ev[2]; sK.input.value = ev[3]; };
    bindControls(host, o, (k) => { if (k === 'ev') preset(); draw(); });
    action(actions, '恢复默认设置', () => { o.ev = 'win'; o.ind = 'off'; preset(); host.querySelectorAll('.lab-opts .choice').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === o[b.dataset.k]))); draw(); }, 'lab-clear');
    preset(); draw();
    onResize(draw);
  }

  /* 10-01 · rewards and later interest. Illustrative levels only; the direction of each case follows the
     1999 meta-analysis (expected, task-contingent tangible rewards undermine later free-choice interest in an
     activity that was already interesting; unexpected rewards do not; informational positive feedback tends to
     enhance it). */
  const RWD = {
    none: ['没有奖励', [0.7, 0.7, 0.7], [0.15, 0.15, 0.15], '对照情况：兴趣保持在原来的水平。'],
    unexp: ['画完后意外得到奖状', [0.7, 0.7, 0.7], [0.15, 0.15, 0.15], '事先不知道有奖励，做事的理由仍然是兴趣本身。经典研究和元分析都没有发现意外奖励会削弱兴趣。'],
    expect: ['事先许诺：画了就有奖品', [0.7, 0.92, 0.48], [0.15, 0.75, 0.15], '事先许诺、只要参与或完成就给的实物奖励，在元分析中显著削弱了奖励取消后自由时间里的兴趣，对儿童尤其明显。'],
    perf: ['事先许诺：画得好才有奖品', [0.7, 0.9, 0.56], [0.15, 0.7, 0.15], '与表现水平挂钩的奖励平均也有削弱作用，但较小；如果奖励真实地反映了一个人的胜任，影响会因条件而不同。'],
    verbal: ['具体的积极反馈', [0.7, 0.78, 0.8], [0.15, 0.3, 0.15], '“这幅画的颜色搭配得很好”这类信息性的积极反馈，总体上增强了兴趣，对大学生的作用比对儿童更明显。'],
  };
  function reward(host) {
    const o = { kind: 'expect', int: 'hi' };
    const { fig, out } = shell(host, '奖励会不会让兴趣消失？',
      '一个假设的孩子在幼儿园的自由活动时间里画画。选择一种奖励方式，以及这项活动对他来说原本是否有趣，看看研究预期他在奖励取消以后，自由时间里还会花多少时间画画。',
      [['kind', '奖励方式', Object.entries(RWD).map(([k, v]) => [k, v[0]])], ['int', '这项活动原本', [['hi', '很有兴趣'], ['lo', '不太感兴趣']]]],
      '这是一个模型演示。柱的高度是示意，只表示研究中观察到的大致方向，不是任何研究的真实数据，也不能预测某一个孩子或你自己的反应。', MODEL);
    const box = document.createElement('div'); fig.append(box);
    const draw = () => {
      const [lab, hi, lo, note] = RWD[o.kind], v = o.int === 'hi' ? hi : lo, W = widthOf(fig), H = 210, L = 12, B = 44, T = 26;
      box.innerHTML = '';
      const names = ['奖励之前', '有奖励期间', '奖励取消以后'];
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `示意：${lab}。自由时间里画画的时间，奖励之前${fmt(v[0] * 10, 0)}，有奖励期间${fmt(v[1] * 10, 0)}，奖励取消以后${fmt(v[2] * 10, 0)}（相对单位）。` }, box);
      text(svg, 0, 13, '花在画画上的时间（示意）', 'lab-tick');
      const cw = (W - L * 2) / 3, bw = Math.min(70, cw * 0.5), Y = (x) => H - B - x * (H - B - T);
      el('line', { x1: 0, x2: W, y1: Y(0), y2: Y(0), class: 'lab-axis' }, svg);
      el('line', { x1: 0, x2: W, y1: Y(v[0]), y2: Y(v[0]), class: 'fx-hair fx-dash' }, svg);
      v.forEach((x, i) => {
        const cx = L + cw * i + cw / 2;
        el('rect', { x: cx - bw / 2, y: Y(x), width: bw, height: Y(0) - Y(x), class: i === 2 ? 'fx-bar' : 'fx-bar b' }, svg);
        text(svg, cx, H - B + 18, names[i], 'lab-tick', 'middle');
        if (i === 1) text(svg, cx, H - B + 33, '（做的时间）', 'lab-tick', 'middle');
        if (i !== 1) text(svg, cx, H - B + 33, '（自由时间）', 'lab-tick', 'middle');
      });
      const d = v[2] - v[0];
      out.innerHTML = `<p class="lab-q">${lab}${o.int === 'hi' ? '，活动原本很有兴趣' : '，活动原本不太感兴趣'}</p>
        <p>${o.int === 'lo' && o.kind !== 'none' && o.kind !== 'unexp' ? '对原本不感兴趣的活动，奖励能让人在奖励期间去做；因为几乎没有可以被削弱的兴趣，奖励取消后通常只是回到原来的水平。元分析中的削弱效应，主要出现在原本有趣的活动上。' : note}</p>
        <p>${o.int === 'hi' ? (d < -0.05 ? '红色的柱低于虚线：奖励取消以后，自由时间里画画的时间比奖励之前少了。' : d > 0.05 ? '红色的柱高于虚线：兴趣有所增加。' : '红色的柱与虚线持平：兴趣没有明显变化。') : ''}关键不在于“有没有奖励”，而在于奖励是否被事先期待、是否与做这件事直接挂钩，以及它被体验为控制还是信息。</p>`;
    };
    bindControls(host, o, draw);
    draw(); onResize(draw);
  }

  /* 10-02 · temporal motivation: utility of working = E·V / (1 + I·D) − aversiveness, against the appeal of
     an immediate alternative. Fourteen days to the deadline; optional three sub-deadlines (days 5, 10, 14). */
  const PRA = { low: ['不太讨厌', 1], mid: ['比较讨厌', 2.5], high: ['非常讨厌', 4] };
  function procras(host) {
    const o = { av: 'mid', mood: 'calm', st: 'one' };
    const { fig, out, actions } = shell(host, '为什么总是“明天再开始”',
      '一项任务第 14 天截止。每一天，模型都会比较两样东西：现在开始做这项任务的吸引力（完成的好处要等到截止时才得到，所以被打了折扣，还要减去做它的不适感），以及做一件立刻就让人好受的事情的吸引力。前者第一次超过后者的那一天，就是模型中“开始工作”的一天。',
      [['av', '任务让人觉得', Object.entries(PRA).map(([k, v]) => [k, v[0]])], ['mood', '此刻的心情', [['calm', '平静'], ['bad', '很糟，想让自己好受一点']]], ['st', '任务结构', [['one', '只有一个最终截止日期'], ['three', '拆成三部分，各有截止日期']]]],
      '这是一个模型演示，依据时间动机理论的简化公式，所有数字都是假设的。它说明的是一种理论机制，不是对你或任何人拖延原因的测量或诊断。', MODEL);
    const sI = slider('模型中的“冲动性”参数（对延迟的敏感程度）：', 0.1, 1.5, 0.1, 0.5);
    const box = document.createElement('div'); fig.append(sI.box, box);
    sI.input.addEventListener('input', () => draw());
    const EV = 8, END = 14;
    const parts = () => (o.st === 'one' ? [[0, END, 1]] : [[0, 5, 0.6], [5, 10, 0.6], [10, END, 0.6]]);
    const draw = () => {
      const I = Number(sI.input.value), A = PRA[o.av][1], alt = 1.5 + (o.mood === 'bad' ? 1.5 : 0);
      sI.val.textContent = ` ${fmt(I, 1)}`; sI.input.setAttribute('aria-valuetext', fmt(I, 1));
      const W = widthOf(fig), H = 250;
      box.innerHTML = '';
      const P = parts().map(([from, d, k]) => {
        const m = (t) => (EV * k) / (1 + I * (d - t)) - A * k;
        let start = null;
        for (let t = from; t <= d; t++) if (m(t) >= alt) { start = t; break; }
        return { from, d, m, start: start == null ? d : start, forced: start == null };
      });
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `模型：${P.map((p, i) => `${P.length > 1 ? `第 ${i + 1} 部分` : '任务'}在第 ${p.start} 天开始${p.forced ? '（截止当天被迫开始）' : ''}`).join('；')}。` }, box);
      const { X, Y } = lc(svg, W, H, { xMax: END, yMax: 8, xTicks: [0, 2, 4, 6, 8, 10, 12, 14], yTicks: [0, 2, 4, 6, 8].map((v) => [v, String(v)]), xLab: '天（第 14 天截止）', yLab: '此刻的吸引力（模型单位）' });
      el('line', { x1: X(0), x2: X(END), y1: Y(alt), y2: Y(alt), class: 'fx-ln fx-lb fx-dash' }, svg);
      text(svg, X(0) + 4, Y(alt) - 6, '立刻让人好受的事', 'lab-tick fx-halo');
      P.forEach((p) => {
        const pts = []; for (let t = p.from; t <= p.d + 1e-9; t += 0.1) pts.push([X(t), Y(Math.max(0, p.m(t)))]);
        line(svg, pts, 'fx-ln fx-lr');
        el('line', { x1: X(p.d), x2: X(p.d), y1: Y(0), y2: Y(8), class: 'fx-hair fx-dash' }, svg);
        el('circle', { cx: X(p.start), cy: Y(Math.max(0, p.m(p.start))), r: 5, class: p.forced ? 'fx-node m' : 'fx-node r' }, svg);
      });
      const days = P.reduce((s, p) => s + (p.d - p.start + 1), 0);
      out.innerHTML = `<ul class="lab-parts">${P.map((p, i) => `<li><span>${P.length > 1 ? `第 ${i + 1} 部分（第 ${p.d} 天截止）` : '开始工作'}</span><b>第 ${p.start} 天${p.forced ? '，截止当天被迫开始' : ''}</b></li>`).join('')}<li><span>开始后到截止，可用于工作的天数</span><b>${days} 天</b></li></ul>
        <p>${P.some((p) => p.forced) ? '在这组设定下，直到截止日期，做任务的吸引力都没有超过“让自己好受一点”的选择：任务带来的不适感太强，或者此刻太想修复心情。拆分任务、缩短延迟也解决不了这个问题，需要处理的是任务本身的不适感和情绪。' : o.st === 'three' ? '把任务拆成三部分、各有截止日期以后，每一部分的好处都更近了，开始的时间被分散到整个两周里。这就是“设立中间截止日期”这类建议背后的机制。' : '红色曲线随着截止日期临近而上升：好处越近，被打的折扣越少。在它超过蓝色虚线之前，模型中的人一直在做“立刻让人好受的事”。'}</p>
        <p class="lab-note">${o.mood === 'bad' ? '心情不好时，“让自己好受一点”的吸引力提高了，所以开始得更晚。这对应蒂斯等人的实验：心情不好、又相信心情可以改变时，人们更多地拖延。' : '把冲动性参数调大，曲线在早期会更低，开始得更晚；调小，开始得更早。这个参数只是模型的一部分，现实中它很难被精确地测量。'}</p>`;
    };
    action(actions, '恢复默认设置', () => { o.av = 'mid'; o.mood = 'calm'; o.st = 'one'; sI.input.value = 0.5; host.querySelectorAll('.lab-opts .choice').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === o[b.dataset.k]))); draw(); }, 'lab-clear');
    bindControls(host, o, draw);
    draw(); onResize(draw);
  }

  /* 10-03 · reactive vs proactive self-control over a two-hour evening study session (expected values). */
  const PRS = {
    react: ['手机放在桌上，每次想看时忍住', 1, 0],
    remove: ['事先把手机放到另一个房间', 0.2, 0],
    plan: ['手机在桌上，但事先定好“如果想看，就……”', 1, 0.5],
  };
  function proreact(host) {
    const o = { s: 'react' };
    const { fig, out, actions } = shell(host, '每次都忍住，还是事先安排？',
      '一个假设的人晚上要专心学习两个小时。手机上的通知、屏幕亮起等线索会不时引起“想看一眼”的冲动。比较三种做法下，他需要抵抗冲动的次数和预计失手的次数。',
      [['s', '做法', Object.entries(PRS).map(([k, v]) => [k, v[0]])]],
      '这是一个模型演示。所有数字都是假设的期望值，用来说明“在冲动出现之前介入”的思路，不代表任何研究的真实数据，也不能衡量任何人的自控力。', MODEL);
    const sC = slider('每小时出现的诱惑线索：', 2, 20, 1, 8), sP = slider('每次抵抗成功的可能性：', 50, 95, 5, 80);
    const box = document.createElement('div'); fig.append(sC.box, sP.box, box);
    [sC, sP].forEach((s) => s.input.addEventListener('input', () => draw()));
    const HRS = 2, INNER = 1; // urges per hour that arise without any outside cue
    const draw = () => {
      const c = Number(sC.input.value), p = Number(sP.input.value) / 100, [lab, keep, help] = PRS[o.s];
      sC.val.textContent = ` ${c} 次`; sP.val.textContent = ` ${sP.input.value}%`;
      sC.input.setAttribute('aria-valuetext', `${c} 次`); sP.input.setAttribute('aria-valuetext', `${sP.input.value}%`);
      const urges = (c * keep + INNER) * HRS, pp = p + (1 - p) * help, lapses = urges * (1 - pp);
      const W = widthOf(fig), H = 96, L = 6, R = 6;
      box.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `模型：两个小时里，约 ${fmt(urges, 0)} 次冲动需要抵抗，预计失手约 ${fmt(lapses, 1)} 次。` }, box);
      text(svg, 0, 13, '两个小时里的冲动（示意）', 'lab-tick');
      const y = 52, X = (t) => L + (t / HRS) * (W - L - R);
      el('line', { x1: X(0), x2: X(HRS), y1: y, y2: y, class: 'lab-axis' }, svg);
      [0, 1, 2].forEach((h) => text(svg, X(h), H - 8, `${h} 小时`, 'lab-tick', h === 0 ? 'start' : h === 2 ? 'end' : 'middle'));
      const n = Math.round(urges), every = lapses > 0.05 ? urges / lapses : Infinity;
      for (let i = 0; i < n; i++) {
        const t = ((i + 0.5) / n) * HRS, lapse = Number.isFinite(every) && Math.floor((i + 1) / every) > Math.floor(i / every);
        el('circle', { cx: X(t), cy: y, r: lapse ? 6 : 4, class: lapse ? 'fx-node r' : 'fx-node b' }, svg);
      }
      text(svg, W - R, 32, '蓝点：抵抗住的冲动　红点：失手', 'lab-tick', 'end');
      out.innerHTML = `<p class="lab-q">${lab}</p><ul class="lab-parts"><li><span>需要抵抗的冲动（两小时）</span><b>约 ${fmt(urges, 0)} 次</b></li><li><span>每次抵抗成功的可能性</span><b>${fmt(pp * 100, 0)}%</b></li><li><span>预计失手</span><b>约 ${fmt(lapses, 1)} 次</b></li></ul>
        <p>${o.s === 'react' ? '每一条线索都要当场抵抗。即使每次的成功率不低，次数多了，失手的总数也会累积起来；而且每一次抵抗都伴随着内心的拉扯。' : o.s === 'remove' ? '线索大部分被事先移除，剩下的主要是没有外部线索时自己冒出的念头。需要抵抗的次数大大减少，这正是“选择或改变情境”这类策略省力的原因。' : '冲动出现的次数没有变，但事先定好的计划让每次的反应更自动、更容易成功。它减少了失手，却没有减少需要应对的次数。'}</p>
        <p class="lab-note">模型假设每小时还有 ${INNER} 次不依赖外部线索的冲动。现实中，改变环境有时做不到，也可能有代价（比如错过重要的电话）；几种做法也可以结合使用。</p>`;
    };
    action(actions, '恢复默认设置', () => { o.s = 'react'; sC.input.value = 8; sP.input.value = 80; host.querySelectorAll('.lab-opts .choice').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === o[b.dataset.k]))); draw(); }, 'lab-clear');
    bindControls(host, o, draw);
    draw(); onResize(draw);
  }

  /* 10-04 · is waiting worth it? Expected value of a promised larger reward (2 units) that is kept with
     probability p, discounted hyperbolically for the wait, against 1 unit now. */
  const DLY = { rel: ['一向说话算话的大人', 95], mid: ['有时守信、有时不守信', 60], unrel: ['刚刚看到他不守承诺', 30] };
  function delay(host) {
    const o = { env: 'rel' };
    const { fig, out, actions } = shell(host, '等一等，值得吗？',
      '一个假设的孩子可以马上吃一块点心，也可以等大人回来，得到两块。但两块点心只有在大人兑现承诺时才能得到。选择一种环境，或者自己调整承诺兑现的可能性和等待的时长，看看等待的“预期价值”怎样变化。',
      [['env', '主持实验的大人', Object.entries(DLY).map(([k, v]) => [k, v[0]])]],
      '这是一个模型演示，所有数字都是假设的。它说明的是“等待是否划算取决于环境”这一思路，不是对任何孩子或成年人自控力的测量。', MODEL);
    const sP = slider('承诺兑现的可能性：', 0, 100, 5, 95), sD = slider('需要等待的时间：', 1, 20, 1, 10);
    const box = document.createElement('div'); fig.append(sP.box, sD.box, box);
    [sP, sD].forEach((s) => s.input.addEventListener('input', () => { o.env = ''; sync(); draw(); }));
    const sync = () => host.querySelectorAll('.lab-opts .choice[data-k="env"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === o.env)));
    const K = 0.03; // hyperbolic discount per minute
    const draw = () => {
      const p = Number(sP.input.value) / 100, D = Number(sD.input.value), ev = (q) => (2 * q) / (1 + K * D), v = ev(p), be = (1 + K * D) / 2;
      sP.val.textContent = ` ${sP.input.value}%`; sD.val.textContent = ` ${D} 分钟`;
      sP.input.setAttribute('aria-valuetext', `${sP.input.value}%`); sD.input.setAttribute('aria-valuetext', `${D} 分钟`);
      const W = widthOf(fig), H = 230;
      box.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `模型：等待的预期价值约 ${fmt(v, 2)} 块，马上吃是 1 块。承诺兑现的可能性高于约 ${fmt(Math.min(1, be) * 100, 0)}% 时，等待才更划算。` }, box);
      const { X, Y } = lc(svg, W, H, { xMax: 100, yMax: 2, xTicks: [0, 25, 50, 75, 100], yTicks: [[0, '0'], [0.5, '0.5'], [1, '1'], [1.5, '1.5'], [2, '2']], xLab: '承诺兑现的可能性（%）', yLab: '预期能得到的点心（块，已考虑等待）' });
      el('line', { x1: X(0), x2: X(100), y1: Y(1), y2: Y(1), class: 'fx-ln fx-lb' }, svg);
      text(svg, X(2), Y(1) - 7, '马上吃：1 块', 'lab-tick fx-halo');
      line(svg, [[X(0), Y(0)], [X(100), Y(ev(1))]], 'fx-ln fx-lr');
      if (be <= 1) { el('line', { x1: X(be * 100), x2: X(be * 100), y1: Y(0), y2: Y(1), class: 'fx-hair fx-dash' }, svg); }
      el('circle', { cx: X(p * 100), cy: Y(v), r: 6, class: 'fx-node r' }, svg);
      const better = v > 1.005 ? 'wait' : v < 0.995 ? 'now' : 'tie';
      out.innerHTML = `<ul class="lab-parts"><li><span>马上吃</span><b>1 块</b></li><li><span>等待的预期价值</span><b>约 ${fmt(v, 2)} 块</b></li><li><span>等待更划算的条件</span><b>${be <= 1 ? `兑现可能性高于约 ${fmt(be * 100, 0)}%` : '在这个等待时长下，等待总是不划算'}</b></li></ul>
        <p>${better === 'wait' ? '在这组设定下，等待的预期价值更高：承诺足够可靠时，等一等是划算的。' : better === 'now' ? '在这组设定下，马上吃更划算。一个不等待的孩子，可能并不是“自控力差”，而是对“等了也未必能得到”作出了合理的判断。' : '在这组设定下，两种选择大致相当。'}</p>
        <p class="lab-note">研究发现，孩子看到大人不守信用之后，等待的时间明显更短。现实中，环境的可靠性往往比这个模型复杂得多，等待的时长本身也常常是不确定的。</p>`;
    };
    const preset = () => { const e = DLY[o.env]; if (e) sP.input.value = e[1]; };
    bindControls(host, o, () => { preset(); draw(); });
    action(actions, '恢复默认设置', () => { o.env = 'rel'; sD.input.value = 10; preset(); sync(); draw(); }, 'lab-clear');
    preset(); draw();
    onResize(draw);
  }


  /* =====================================================================
     Stage 11 · individual differences. Every demo draws hypothetical scores
     from a stated rule; none scores the reader, and each says so on screen.
     ===================================================================== */
  const nPhi = (x) => { // standard normal CDF (Abramowitz–Stegun 7.1.26)
    const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
    return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
  };
  const seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const sNorm = (r) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const pctP = (p) => (p < 0.01 ? '不到 1%' : p > 0.99 ? '超过 99%' : `约 ${Math.round(p * 100)}%`);
  // a bell curve over [a, b] on a baseline; returns the path string
  const bell = (X, Y, m, sd, a, b) => { let d = ''; for (let v = a; v <= b + 1e-9; v += (b - a) / 160) d += (d ? ' L' : 'M') + `${X(v).toFixed(1)},${Y(Math.exp(-0.5 * ((v - m) / sd) ** 2)).toFixed(1)}`; return d; };

  /* 11-02 · cutoff: two hypothetical people on one continuous preference score; a fixed cut turns
     the score into a letter. Error on retest = 10 × √(1 − reliability) on a scale with SD 10. */
  function cutoff(host) {
    const { fig, out, actions } = shell(host, '差两分，就是另一种“类型”？',
      '下面是一个假设的“外倾—内倾”连续分数，人群平均为 50 分，标准差为 10 分。像许多类型测试一样，以 50 分为界：高于 50 分记为 E（外倾），否则记为 I（内倾）。甲的分数固定为 48 分；拖动滑块改变乙的分数和测验的信度，看看标签会怎样。',
      [], '这是一个模型演示。人群分布、两个人的分数和信度都是假设的，不来自任何真实问卷，也不会测量你的人格。', MODEL);
    const sB = slider('乙的分数：', 35, 65, 1, 52), sR = slider('测验的信度：', 0.7, 0.95, 0.05, 0.8);
    const box = document.createElement('div'); fig.append(sB.box, sR.box, box);
    let retest = null;
    [sB, sR].forEach((s) => s.input.addEventListener('input', () => { retest = null; draw(); }));
    const draw = () => {
      const b = Number(sB.input.value), rel = Number(sR.input.value), sem = 10 * Math.sqrt(1 - rel), a = 48;
      sB.val.textContent = ` ${b} 分`; sR.val.textContent = ` ${fmt(rel, 2)}`;
      sB.input.setAttribute('aria-valuetext', `${b} 分`); sR.input.setAttribute('aria-valuetext', fmt(rel, 2));
      const lab = (s) => (s > 50 ? 'E' : 'I'), W = widthOf(fig), H = 220, L = 8, R = 8, base = 120, top = 26;
      const X = (v) => L + (v - 20) / 60 * (W - L - R), Y = (k) => base - k * (base - top);
      box.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `模型：甲 48 分，记为 I；乙 ${b} 分，记为 ${lab(b)}。两人相差 ${Math.abs(b - a)} 分。` }, box);
      el('path', { d: bell(X, Y, 50, 10, 20, 80), class: 'fx-ln fx-curve' }, svg);
      el('line', { x1: L, x2: W - R, y1: base, y2: base, class: 'lab-axis' }, svg);
      [20, 30, 40, 50, 60, 70, 80].forEach((v) => text(svg, X(v), base + 16, String(v), 'lab-tick', 'middle'));
      el('line', { x1: X(50), x2: X(50), y1: top - 10, y2: base, class: 'fx-ln fx-dash' }, svg);
      text(svg, X(50) - 6, top - 12, '← I（内倾）', 'lab-tick', 'end'); text(svg, X(50) + 6, top - 12, 'E（外倾）→', 'lab-tick');
      const person = (s, y, cls, name) => {
        el('rect', { x: X(Math.max(20, s - 1.96 * sem)), y: y - 5, width: Math.max(2, X(Math.min(80, s + 1.96 * sem)) - X(Math.max(20, s - 1.96 * sem))), height: 10, rx: 5, class: 'fx-band1' }, svg);
        el('circle', { cx: X(s), cy: y, r: 6, class: 'fx-node ' + cls }, svg);
        const right = X(s) < W * 0.55; text(svg, X(s) + (right ? 12 : -12), y + 4, `${name} ${s} 分 → ${lab(s)}`, 'lab-tick fx-halo', right ? 'start' : 'end');
      };
      person(a, 152, 'b', '甲'); person(b, 182, 'r', '乙');
      if (retest) retest.forEach(([s, y]) => { el('circle', { cx: X(Math.max(20, Math.min(80, s))), cy: y, r: 5, class: 'fx-node m' }, svg); });
      text(svg, 0, H - 4, W < 400 ? '浅色带：重测分数的大致范围（约 95%）' : '浅色带：重测时分数大致会落在的范围（约 95%）', 'lab-tick');
      const flip = (s) => nPhi(-Math.abs(s - 50) / sem);
      const rt = retest ? `<li><span>模拟重测一次</span><b>甲 ${fmt(retest[0][0], 0)} 分 → ${lab(retest[0][0])}；乙 ${fmt(retest[1][0], 0)} 分 → ${lab(retest[1][0])}</b></li>` : '';
      out.innerHTML = `<ul class="lab-parts"><li><span>两人的分数相差</span><b>${Math.abs(b - a)} 分（${fmt(Math.abs(b - a) / 10, 1)} 个标准差）</b></li><li><span>得到的标签</span><b>甲 I；乙 ${lab(b)}</b></li><li><span>重测时得到另一个字母的可能性</span><b>甲 ${pctP(flip(a))}；乙 ${pctP(flip(b))}</b></li>${rt}</ul>
        <p>${lab(b) !== 'I' && Math.abs(b - a) <= 6 ? '两个人的分数几乎一样，却被分到了相反的“类型”；而分数相差更多、但在分界点同一侧的两个人，却被看作同一类。' : lab(b) === 'I' ? '现在两个人都被记为 I。注意：在同一类别里，分数仍然可以相差很多。' : '两个人分数相差较大，标签不同。但即使如此，标签也丢掉了“差多少”的信息。'}越靠近分界点，测量误差越容易让标签在重测时翻转；信度越低，翻转越常见。</p>
        <p class="lab-note">这里假设两个人的真实分数就是图中的值，只考虑测量误差，没有考虑人格本身的变化。</p>`;
    };
    action(actions, '模拟重测一次', () => {
      const rel = Number(sR.input.value), sem = 10 * Math.sqrt(1 - rel);
      retest = [[48 + sem * sNorm(Math.random), 152], [Number(sB.input.value) + sem * sNorm(Math.random), 182]];
      draw();
    });
    action(actions, '恢复默认设置', () => { sB.input.value = 52; sR.input.value = 0.8; retest = null; draw(); }, 'lab-clear');
    draw();
    onResize(draw);
  }

  /* 11-03 · rankmean: 12 hypothetical people measured twice. Time-2 score = r × z1 + √(1 − r²) × e + shift,
     with z1 and e fixed (seeded), so the sliders change only rank-order stability (r) and mean-level change. */
  const RMP = { both: ['均值上升，排序大致稳定', 0.8, 0.5], mean: ['只有均值上升', 1, 0.5], rank: ['均值不变，排序被打乱', 0.2, 0] };
  function rankmean(host) {
    const o = { mode: 'both' };
    const { fig, out, actions } = shell(host, '排序稳定与均值变化',
      '12 个假设的人在 20 岁和 30 岁时各测了一次尽责性（标准分）。每条线连接同一个人的两次分数。选择一种情况，或者自己调整两个参数。',
      [['mode', '情况', Object.entries(RMP).map(([k, v]) => [k, v[0]])]],
      '这是一个模型演示，12 个人和他们的分数都是按规则生成的假设数据，不是真实研究的结果。', MODEL);
    const sr = slider('排序稳定性（前后相关）：', 0, 1, 0.05, 0.8), sm = slider('平均水平的变化（标准差）：', -1, 1, 0.1, 0.5);
    const box = document.createElement('div'); fig.append(sr.box, sm.box, box);
    const sync = () => host.querySelectorAll('.lab-opts .choice[data-k="mode"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === o.mode)));
    [sr, sm].forEach((s) => s.input.addEventListener('input', () => { o.mode = ''; sync(); draw(); }));
    const r0 = seeded(11), N = 12;
    let z = Array.from({ length: N }, () => sNorm(r0)), e = Array.from({ length: N }, () => sNorm(r0));
    const std = (a) => { const m = mean(a), s = Math.sqrt(mean(a.map((x) => (x - m) ** 2))); return a.map((x) => (x - m) / s); };
    z = std(z); e = std(e); const k = corr(z, e); e = std(e.map((x, i) => x - k * z[i])); // make e uncorrelated with z
    const draw = () => {
      const r = Number(sr.input.value), sh = Number(sm.input.value);
      sr.val.textContent = ` ${fmt(r, 2)}`; sm.val.textContent = ` ${sh > 0 ? '+' : ''}${fmt(sh, 1)}`;
      sr.input.setAttribute('aria-valuetext', fmt(r, 2)); sm.input.setAttribute('aria-valuetext', `${fmt(sh, 1)} 个标准差`);
      const t2 = z.map((x, i) => r * x + Math.sqrt(Math.max(0, 1 - r * r)) * e[i] + sh);
      const W = widthOf(fig), H = 260, L = 64, R = 64, T = 26, B = 24, Y = (v) => T + (1 - (v + 2.6) / 6) * (H - T - B);
      box.innerHTML = '';
      const rk = (a) => { const s = a.map((v, i) => [v, i]).sort((p, q) => q[0] - p[0]); const out2 = []; s.forEach(([, i], j) => { out2[i] = j; }); return out2; };
      const k1 = rk(z), k2 = rk(t2), moved = Math.max(...k1.map((v, i) => Math.abs(v - k2[i])));
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `模型：两次测量的相关约 ${fmt(corr(z, t2), 2)}，平均变化 ${fmt(sh, 1)} 个标准差。` }, box);
      [[L, '20 岁'], [W - R, '30 岁']].forEach(([x, s]) => { el('line', { x1: x, x2: x, y1: T - 4, y2: H - B, class: 'lab-axis' }, svg); text(svg, x, 14, s, 'lab-tick', 'middle'); });
      [-2, 2].forEach((v) => { text(svg, L - 8, Y(v) + 4, v > 0 ? `+${v}` : String(v), 'lab-tick', 'end'); });
      z.forEach((x, i) => {
        const top3 = k1[i] < 3;
        el('line', { x1: L, y1: Y(x), x2: W - R, y2: Y(t2[i]), class: top3 ? 'fx-ln fx-lr' : 'fx-ln fx-faint' }, svg);
        el('circle', { cx: L, cy: Y(x), r: 4, class: 'fx-node ' + (top3 ? 'r' : 'b') }, svg);
        el('circle', { cx: W - R, cy: Y(t2[i]), r: 4, class: 'fx-node ' + (top3 ? 'r' : 'b') }, svg);
      });
      [[L, 0], [W - R, mean(t2)]].forEach(([x, m], j) => { el('line', { x1: x - 14, x2: x + 14, y1: Y(m), y2: Y(m), class: 'fx-ln fx-thick' }, svg); text(svg, j ? x + 18 : x - 18, Y(m) + 4, j ? '平均' : '平均 0', 'lab-tick fx-halo', j ? 'start' : 'end'); });
      const rr = corr(z, t2), mc = mean(t2);
      out.innerHTML = `<ul class="lab-parts"><li><span>前后两次的相关（排序稳定性）</span><b>${fmt(rr, 2)}</b></li><li><span>平均水平的变化</span><b>${mc >= 0 ? '+' : ''}${fmt(mc, 1)} 个标准差</b></li><li><span>名次变化最大的人移动了</span><b>${moved} 位</b></li></ul>
        <p>${r >= 0.95 && Math.abs(sh) >= 0.3 ? '每个人都改变了，而且改变的幅度一样，所以相对位置完全不变：“人都在变”和“排序很稳定”可以同时成立。' : r <= 0.35 && Math.abs(sh) < 0.15 ? '平均水平几乎没有变，但人与人之间的相对位置被大幅打乱：只看平均数，会以为“什么都没变”。' : '红线是 20 岁时得分最高的三个人。排序稳定性越高，他们 30 岁时越可能仍然排在前面；平均水平的变化则让所有人一起上移或下移。'}</p>
        <p class="lab-note">真实研究中，成年人在几年间隔上的排序稳定性大多在中等到较高之间，均值变化通常小于这里的最大值。</p>`;
    };
    const preset = () => { const p = RMP[o.mode]; if (p) { sr.input.value = p[1]; sm.input.value = p[2]; } };
    bindControls(host, o, () => { preset(); draw(); });
    action(actions, '恢复默认设置', () => { o.mode = 'both'; preset(); sync(); draw(); }, 'lab-clear');
    preset(); draw();
    onResize(draw);
  }

  /* 11-04 · iqerror: a standard score (mean 100, SD 15) and the range implied by measurement error,
     ±1.96 × 15 × √(1 − reliability). Simplified: real reports often centre the range on an estimated true score. */
  function iqerror(host) {
    const { fig, out, actions } = shell(host, '一个分数，一个范围',
      '假设一个人在一项智力测验上得到了某个标准分数（平均 100，标准差 15）。拖动滑块改变这个分数和测验的信度，看看这个分数在同龄人中的位置，以及测量误差意味着什么。',
      [], '这是一个模型演示，分数和信度都是假设的，不是对任何人的测量。几道网页题目也无法测出智商。', MODEL);
    const sS = slider('观测到的分数：', 70, 130, 1, 112), sR = slider('测验的信度：', 0.7, 0.97, 0.01, 0.9);
    const box = document.createElement('div'); fig.append(sS.box, sR.box, box);
    [sS, sR].forEach((s) => s.input.addEventListener('input', () => draw()));
    const draw = () => {
      const s = Number(sS.input.value), rel = Number(sR.input.value), sem = 15 * Math.sqrt(1 - rel), lo = s - 1.96 * sem, hi = s + 1.96 * sem;
      sS.val.textContent = ` ${s}`; sR.val.textContent = ` ${fmt(rel, 2)}`;
      sS.input.setAttribute('aria-valuetext', String(s)); sR.input.setAttribute('aria-valuetext', fmt(rel, 2));
      const W = widthOf(fig), H = 206, L = 8, R = 8, base = 150, top = 30;
      const X = (v) => L + (v - 52) / 96 * (W - L - R), Y = (k) => base - k * (base - top);
      box.innerHTML = '';
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `模型：分数 ${s}，约高于 ${Math.round(nPhi((s - 100) / 15) * 100)}% 的同龄人；考虑测量误差，大致范围是 ${Math.round(lo)} 到 ${Math.round(hi)}。` }, box);
      const a = Math.max(52, lo), b = Math.min(148, hi);
      let band = `M${X(a)},${base}`; for (let v = a; v <= b + 1e-9; v += (b - a) / 60) band += ` L${X(v)},${Y(Math.exp(-0.5 * ((v - 100) / 15) ** 2))}`; band += ` L${X(b)},${base} Z`;
      el('path', { d: band, class: 'fx-band1' }, svg);
      el('path', { d: bell(X, Y, 100, 15, 52, 148), class: 'fx-ln fx-curve' }, svg);
      el('line', { x1: L, x2: W - R, y1: base, y2: base, class: 'lab-axis' }, svg);
      [55, 70, 85, 100, 115, 130, 145].forEach((v) => text(svg, X(v), base + 19, String(v), 'lab-tick', 'middle'));
      el('line', { x1: X(s), x2: X(s), y1: Y(Math.exp(-0.5 * ((s - 100) / 15) ** 2)) - 8, y2: base, class: 'fx-ln fx-lr' }, svg);
      el('circle', { cx: X(s), cy: base, r: 5, class: 'fx-node r' }, svg);
      el('path', { d: `M${X(lo)},${base + 31} v-5 H${X(hi)} v5`, class: 'fx-ln fx-lb' }, svg);
      text(svg, X(s), base + 47, `大致范围 ${Math.round(lo)}–${Math.round(hi)}`, 'lab-tick fx-halo', 'middle');
      out.innerHTML = `<ul class="lab-parts"><li><span>这个分数约高于同龄人中的</span><b>${pctP(nPhi((s - 100) / 15))}</b></li><li><span>测量标准误</span><b>约 ${fmt(sem, 1)} 分</b></li><li><span>考虑误差的大致范围（约 95%）</span><b>${Math.round(lo)} 到 ${Math.round(hi)}</b></li><li><span>范围两端对应的位置</span><b>${pctP(nPhi((lo - 100) / 15))} 到 ${pctP(nPhi((hi - 100) / 15))}</b></li></ul>
        <p>同样是 ${s} 分，信度为 ${fmt(rel, 2)} 时，这个分数对应的可能范围宽约 ${Math.round(hi - lo)} 分。信度越低，范围越宽；两个人相差几分，往往在测量误差之内。</p>
        <p class="lab-note">这是简化的算法。专业报告通常由受过训练的人员解释，会使用更精确的方法计算范围，并结合其他信息。</p>`;
    };
    action(actions, '恢复默认设置', () => { sS.input.value = 112; sR.input.value = 0.9; draw(); }, 'lab-clear');
    draw();
    onResize(draw);
  }

  /* 11-05 · overlap: two hypothetical groups, normal with equal SD, means d apart.
     Overlap = 2Φ(−d/2); P(random member of the higher group scores higher) = Φ(d/√2). */
  const OVP = { s1: ['很小（0.1）', 0.1], s2: ['小（0.2）', 0.2], s5: ['中等（0.5）', 0.5], s8: ['较大（0.8）', 0.8] };
  function overlap(host) {
    const o = { size: 's2' };
    const { fig, out, actions } = shell(host, '两个分布重叠了多少',
      '甲组和乙组是两个虚构的群体，某项测验分数在两组内部的分散程度相同，只是乙组的平均数高一些。选择一个效应量 d，或者拖动滑块，看看两个分布重叠了多少；也可以从两组中各随机抽人比较。',
      [['size', '效应量 d', Object.entries(OVP).map(([k, v]) => [k, v[0]])]],
      '甲组和乙组是虚构的，不代表任何真实的性别、民族、国家或其他群体；随机抽取的结果由程序在你的浏览器里生成。');
    const sd = slider('两组平均数之差 d：', 0, 1.5, 0.05, 0.2);
    const box = document.createElement('div'); fig.append(sd.box, box);
    const sync = () => host.querySelectorAll('.lab-opts .choice[data-k="size"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === o.size)));
    sd.input.addEventListener('input', () => { o.size = ''; sync(); pairs = null; draw(); });
    let pairs = null;
    const draw = () => {
      const d = Number(sd.input.value);
      sd.val.textContent = ` ${fmt(d, 2)}`; sd.input.setAttribute('aria-valuetext', fmt(d, 2));
      const W = widthOf(fig), H = pairs ? 228 : 174, L = 8, R = 8, base = 150, top = 34, lo = -3.4, hi = 3.4 + d;
      const X = (v) => L + (v - lo) / (hi - lo) * (W - L - R), Y = (k) => base - k * (base - top), f = (v, m) => Math.exp(-0.5 * (v - m) ** 2);
      box.innerHTML = '';
      const ovl = 2 * nPhi(-d / 2), ps = nPhi(d / Math.SQRT2);
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `模型：两组平均数相差 ${fmt(d, 2)} 个标准差，分布重叠约 ${Math.round(ovl * 100)}%。` }, box);
      let ar = `M${X(lo)},${base}`; for (let v = lo; v <= hi + 1e-9; v += (hi - lo) / 200) ar += ` L${X(v)},${Y(Math.min(f(v, 0), f(v, d)))}`; ar += ` L${X(hi)},${base} Z`;
      el('path', { d: ar, class: 'fx-band1' }, svg);
      el('path', { d: bell(X, Y, 0, 1, lo, hi), class: 'fx-ln fx-lb fx-curve' }, svg);
      el('path', { d: bell(X, Y, d, 1, lo, hi), class: 'fx-ln fx-lr fx-curve' }, svg);
      el('line', { x1: L, x2: W - R, y1: base, y2: base, class: 'lab-axis' }, svg);
      text(svg, X(0) - 4, top - 8, '甲组', 'lab-tick fx-b', 'end'); text(svg, X(d) + 4, top - 8, '乙组', 'lab-tick fx-r');
      text(svg, W - R, base + 16, '测验分数 →', 'lab-tick', 'end');
      if (pairs) pairs.forEach(([a, b], i) => {
        const y = base + 30 + (i % 2) * 10;
        el('circle', { cx: X(Math.max(lo, Math.min(hi, a))), cy: y, r: 3.5, class: 'fx-node b' }, svg);
        el('circle', { cx: X(Math.max(lo, Math.min(hi, b))), cy: y + 20, r: 3.5, class: 'fx-node r' }, svg);
      });
      const win = pairs ? pairs.filter(([a, b]) => a > b).length : 0;
      out.innerHTML = `<ul class="lab-parts"><li><span>两个分布重叠的部分</span><b>${pctP(ovl)}</b></li><li><span>各随机抽一人，甲组的人分数更高的可能性</span><b>${pctP(1 - ps)}</b></li><li><span>乙组中高于甲组平均数的人</span><b>${pctP(nPhi(d))}</b></li>${pairs ? `<li><span>刚才随机抽取的 20 对中，甲组的人更高</span><b>${win} 对</b></li>` : ''}</ul>
        <p>${d < 0.15 ? '两个分布几乎完全重叠，知道一个人属于哪一组，几乎不能告诉你他的分数。' : d < 0.6 ? '平均数确实不同，但两个分布的大部分是重叠的：两组中都有很多高分和低分的人。' : '这已经是心理学研究中较大的差异了，但两个分布仍有大量重叠，用组别去猜某一个人的分数，仍然经常会猜错。'}</p>
        <p class="lab-note">图中阴影是两个分布重叠的部分。真实研究中，两组的分散程度也可能不同，这会改变两端的人数比例，但不会改变“平均数不能决定个人”的结论。</p>`;
    };
    const preset = () => { const p = OVP[o.size]; if (p) sd.input.value = p[1]; };
    bindControls(host, o, () => { preset(); pairs = null; draw(); });
    action(actions, '各随机抽取 20 人比较', () => { const d = Number(sd.input.value); pairs = Array.from({ length: 20 }, () => [rnorm(), d + rnorm()]); draw(); });
    action(actions, '恢复默认设置', () => { o.size = 's2'; preset(); sync(); pairs = null; draw(); }, 'lab-clear');
    preset(); draw();
    onResize(draw);
  }

  window.PPLab = { experiment, confound, studies, sdt, muller, stroop, change, pavlov, rw, schedules, habit, serial, span, cue, misinfo, spacing, garden, stream, label, ninedot, uses, anchor, prospect, frame, sunk, discount, calib, regulate, adapt, reward, procras, proreact, delay, cutoff, rankmean, iqerror, overlap };
})();
