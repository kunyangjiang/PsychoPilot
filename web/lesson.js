/* PsychoPilot — lesson reader. Loads a written lesson into course.html (if one exists for this id),
   numbers its sections, builds a contents list, links [n] citations, and fills in the lesson's
   demonstration and knowledge checks. Lessons without a manuscript keep the "in preparation" page. */
(() => {
  'use strict';
  const READY = {};
  ['01-01', '01-02', '01-03', '01-04', '02-01', '02-02', '02-03', '02-04', '02-05'].forEach((k) => { READY[k] = `lessons/${k}.html`; });

  const id = new URLSearchParams(location.search).get('id') || '01-01';
  const src = READY[id];
  if (!src) return;

  const $ = (s, r = document) => r.querySelector(s);
  const KEY = 'pp.l.' + id;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = (st) => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
  const state = load();

  fetch(src).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); }).then((html) => {
    const body = document.createElement('div');
    body.className = 'l-text';
    body.innerHTML = html;

    // numbered section heads, and the contents list
    const toc = document.createElement('nav');
    toc.className = 'l-toc';
    toc.setAttribute('aria-label', '本讲目录');
    const items = [];
    let n = 0;
    body.querySelectorAll('section > h2').forEach((h) => {
      const sec = h.parentElement;
      const numbered = !sec.classList.contains('l-refs') && sec.id !== 'quiz' && !sec.classList.contains('l-sum');
      if (numbered) { n += 1; h.insertAdjacentHTML('afterbegin', `<span class="num" aria-hidden="true">${n}</span>`); }
      items.push(`<li><a href="#${sec.id}">${numbered ? `<b>${n}</b>` : '<b>·</b>'}${h.textContent.replace(/^\d+/, '')}</a></li>`);
    });
    toc.innerHTML = `<p class="lab">Contents</p><ol>${items.join('')}</ol>`;

    // [n] → citation link (outside the reference list)
    body.querySelectorAll(':scope > p, section:not(.l-refs) p, section:not(.l-refs) td, section:not(.l-refs) li').forEach((el) => {
      el.innerHTML = el.innerHTML.replace(/\[(\d{1,2})\]/g, '<a class="cite" href="#ref-$1" aria-label="参考文献 $1">[$1]</a>');
    });

    const wrap = document.createElement('div');
    wrap.className = 'l-body';
    wrap.append(toc, body);
    $('#lesson').replaceWith(wrap);
    document.querySelectorAll('.stamp, .l-note').forEach((el) => el.remove());

    const demo = $('[data-demo="obvious"]', body);
    if (demo) obvious(demo);
    const rule = $('[data-demo="rule"]', body);
    if (rule) ruleGame(rule);
    // simulation demos for the method lessons live in lab.js
    body.querySelectorAll('[data-demo]').forEach((h) => window.PPLab?.[h.dataset.demo]?.(h));
    // explanatory figures (flowcharts, line drawings, small animations) live in figs.js
    body.querySelectorAll('[data-figure]').forEach((f) => window.PPFig?.[f.dataset.figure]?.(f));
    const quiz = $('[data-quiz]', body);
    if (quiz) checks(quiz);
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }).catch(() => {
    const note = $('.l-note');
    if (note) note.insertAdjacentHTML('beforeend', '<p>正文暂时没有加载成功，请刷新页面再试。</p>');
  });

  /* ---------------------------------------------------------------------
     Demonstration: "这还用研究？" Half the statements are reversed on purpose.
     The learner's answers are a classroom demonstration, not research data.
     --------------------------------------------------------------------- */
  const FINDINGS = [
    { k: 'space', ref: 4,
      t: '把复习分散到几天，比考前一次性集中复习，记得更久。',
      f: '考前一次性集中复习，比把复习分散到几天，记得更久。',
      note: '一篇汇总了数百个实验的综述发现，只要测试安排在学习之后较长一段时间，分散练习的效果都稳定地好于集中练习。' },
    { k: 'vent', ref: 5,
      t: '生气时用力打沙袋“发泄”，之后人会更有攻击性，而不是更平静。',
      f: '生气时用力打沙袋“发泄”，之后人会更平静，攻击性更低。',
      note: '在实验中，先被人故意激怒，再一边想着这个人一边打沙袋的参与者，事后比安静坐着什么也不做的参与者更生气，攻击性也更强。“发泄”并没有让怒气消散，反而让人一直想着这件事。' },
    { k: 'bystander', ref: 6,
      t: '以为还有别人也听到了求救时，人更不容易、也更慢去帮忙。',
      f: '以为还有别人也听到了求救时，人更容易、也更快去帮忙。',
      note: '参与者通过对讲机听到有人突然发病。如果他们以为只有自己听到了，绝大多数人会去求助；如果以为还有好几个人也听到了，去求助的人明显更少，行动也更慢。' },
    { k: 'test', ref: 7,
      t: '读完一篇文章后做一次自测，比把同样的时间用来再读一遍，一周后记得更多。',
      f: '读完一篇文章后再读一遍，比把同样的时间用来做一次自测，一周后记得更多。',
      note: '一周后测试时，做过自测的一组记得更多。有意思的是，如果五分钟后就测试，反而是重读的那一组成绩略好。可见一个结论成立与否，往往取决于具体条件。' },
  ];

  function obvious(host) {
    const st = state.demo || {};
    if (!st.flip) { // two statements reversed, chosen at random once per visitor
      const order = FINDINGS.map((f) => f.k).sort(() => Math.random() - 0.5);
      st.flip = order.slice(0, 2);
      st.ans = {};
      state.demo = st; save(state);
    }
    host.className = 'l-demo';
    host.innerHTML = `
      <div class="l-demo-head">
        <p class="lab">Demonstration · 课堂演示</p>
        <h3>这还用研究？</h3>
        <p>下面有四条“研究发现”。请读完每一条后凭第一感觉回答：这是你早就知道的，还是让你有点意外？<br>
        <b>注意：</b>其中有两条被故意改成了相反的意思。你的选择只保存在这台设备上，仅用于课堂演示，不会作为研究数据。</p>
      </div>
      <ol class="l-cards"></ol>
      <div class="l-demo-sum" aria-live="polite"></div>`;
    const list = $('.l-cards', host), sum = $('.l-demo-sum', host);

    const draw = () => {
      list.innerHTML = FINDINGS.map((f, i) => {
        const flipped = st.flip.includes(f.k), a = st.ans[f.k];
        return `<li class="l-card${a ? ' is-done' : ''}">
          <p class="l-card-k">研究发现 ${i + 1}</p>
          <p class="l-card-t">${flipped ? f.f : f.t}</p>
          ${a ? `<div class="l-card-r">
              <p><span class="l-tag ${flipped ? 'is-f' : 'is-t'}">${flipped ? '这条被改反了' : '这条是真实结论'}</span>你选了“${a === 'knew' ? '早就知道' : '有点意外'}”。</p>
              ${flipped ? `<p>真实的结论是：<b>${f.t}</b></p>` : ''}
              <p class="l-card-n">${f.note}<a class="cite" href="#ref-${f.ref}">[${f.ref}]</a></p>
            </div>`
            : `<div class="choices" role="group" aria-label="研究发现 ${i + 1}：你的感觉">
              <button class="choice" type="button" data-k="${f.k}" data-a="knew">早就知道</button>
              <button class="choice" type="button" data-k="${f.k}" data-a="new">有点意外</button>
            </div>`}
        </li>`;
      }).join('');
      const done = Object.keys(st.ans).length;
      if (done < FINDINGS.length) { sum.innerHTML = ''; return; }
      const knew = FINDINGS.filter((f) => st.ans[f.k] === 'knew');
      const knewFlipped = knew.filter((f) => st.flip.includes(f.k)).length;
      sum.innerHTML = `<p>你对其中 <b>${knew.length}</b> 条选了“早就知道”，而这里面有 <b>${knewFlipped}</b> 条其实是被故意改反的说法。</p>
        <p>${knewFlipped ? '可见，即使是错误的说法，也能让人觉得自己“早就知道”。这正是这个演示想让你看到的：' : '你没有被改反的说法骗到，不过很多人都会上当。这个演示想说明的是：'}一个说法“听起来很明显”，并不能告诉我们它是不是真的。</p>
        <button class="l-reset" type="button">换一组再试</button>`;
    };
    host.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.classList.contains('l-reset')) { delete state.demo; save(state); return obvious(host); }
      if (!b.dataset.k) return;
      st.ans[b.dataset.k] = b.dataset.a;
      save(state);
      draw();
      host.querySelector(`.l-card:nth-child(${FINDINGS.findIndex((f) => f.k === b.dataset.k) + 1}) .l-card-r`)?.setAttribute('tabindex', '-1');
    });
    draw();
  }

  /* ---------------------------------------------------------------------
     Demonstration (01-02): the 2-4-6 task after Wason (1960). The hidden rule is
     "any three numbers in increasing order". Tests stay on this device only.
     --------------------------------------------------------------------- */
  // [key, label, does this rule accept the triple?]
  const GUESSES = [
    ['plus2', '每次加 2', (t) => t[1] - t[0] === 2 && t[2] - t[1] === 2],
    ['even', '三个都是偶数', (t) => t.every((v) => v % 2 === 0)],
    ['same', '相邻两个数之间的差相同', (t) => t[1] - t[0] === t[2] - t[1]],
    ['up', '从小到大排列的任意三个数', (t) => t[0] < t[1] && t[1] < t[2]],
  ];
  function ruleGame(host) {
    const st = state.rule || (state.rule = { tests: [], guess: null });
    const fits = (t) => t[0] < t[1] && t[1] < t[2];
    host.className = 'l-demo';
    host.innerHTML = `
      <div class="l-demo-head">
        <p class="lab">Demonstration · 课堂演示</p>
        <h3>猜规则：2，4，6</h3>
        <p>我心里有一条关于“三个数”的规则，<b>2，4，6</b> 符合这条规则。你可以随意写下三个数来试探，我会告诉你它们是否符合。你可以试很多次，觉得有把握了，再选出你认为的规则。你的记录只保存在这台设备上。</p>
      </div>
      <form class="l-rule-form" novalidate>
        <input type="number" step="any" inputmode="decimal" aria-label="第一个数">
        <input type="number" step="any" inputmode="decimal" aria-label="第二个数">
        <input type="number" step="any" inputmode="decimal" aria-label="第三个数">
        <button class="choice" type="submit">检验</button>
      </form>
      <p class="l-rule-hint" aria-live="polite"></p>
      <ol class="l-rule-log" aria-label="你的检验记录"></ol>
      <div class="l-rule-guess"></div>
      <div class="l-demo-sum" aria-live="polite"></div>`;
    const form = $('.l-rule-form', host), log = $('.l-rule-log', host), hint = $('.l-rule-hint', host);
    const guessBox = $('.l-rule-guess', host), sum = $('.l-demo-sum', host);
    const inputs = [...form.querySelectorAll('input')];

    const draw = () => {
      log.innerHTML = st.tests.map((t) => `<li><span class="l-rule-t">${t.join('，')}</span><span class="l-tag ${fits(t) ? 'is-t' : 'is-f'}">${fits(t) ? '符合' : '不符合'}</span></li>`).join('');
      if (!st.tests.length) { guessBox.innerHTML = ''; sum.innerHTML = ''; return; }
      if (!st.guess) {
        guessBox.innerHTML = `<p class="l-card-k">有把握了吗？选出你认为的规则</p><div class="choices">${GUESSES.map(([k, t]) => `<button class="choice" type="button" data-g="${k}">${t}</button>`).join('')}</div>`;
        sum.innerHTML = '';
        return;
      }
      guessBox.innerHTML = '';
      const [, picked, accepts] = GUESSES.find(([k]) => k === st.guess), right = st.guess === 'up';
      // what makes a test informative is whether it could have shown the chosen rule to be wrong,
      // not whether the answer happened to be "符合" or "不符合"
      const risky = st.tests.filter((t) => !accepts(t)), refuted = st.tests.filter((t) => accepts(t) !== fits(t));
      sum.innerHTML = `<p>你选的是“${picked}”。${right ? '猜对了。' : '真正的规则是：<b>从小到大排列的任意三个数</b>。'}</p>
        <p>判断一次检验有没有价值，不看它得到的是“符合”还是“不符合”，而要看它<b>有没有可能证明你的猜想是错的</b>。你一共检验了 <b>${st.tests.length}</b> 组数，其中 <b>${risky.length}</b> 组按照你选的规则应该“不符合”。${risky.length
          ? '这些才是真正在考验你的猜想的检验。'
          : '也就是说，你的每一次检验都是按自己的猜想“应该符合”的数，这样的检验得到“符合”只能说明猜想在这些例子上没有出错，却很难暴露它可能存在的问题，比如规则其实比你想的更宽。'}${!right && refuted.length
          ? `其中有 <b>${refuted.length}</b> 组数的实际结果和你选的规则不一致，这本身就说明这条规则不对。`
          : ''}</p>
        <p>在沃森 1960 年的原始实验中，大多数参与者都先报出过错误的规则：他们反复检验符合自己猜想的数，却很少去试一组“按自己的猜想应该不符合”的数。</p>
        <button class="l-reset" type="button">清空记录，重新试一次</button>`;
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const t = inputs.map((i) => i.value.trim() === '' ? NaN : Number(i.value));
      if (t.some((v) => !Number.isFinite(v))) { hint.textContent = '请在三个格子里都填上数字。'; return; }
      hint.textContent = '';
      st.tests.push(t); save(state);
      inputs.forEach((i) => { i.value = ''; });
      inputs[0].focus();
      draw();
    });
    host.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.g) { st.guess = b.dataset.g; save(state); draw(); sum.setAttribute('tabindex', '-1'); sum.focus({ preventScroll: true }); }
      else if (b.classList.contains('l-reset')) { st.tests = []; st.guess = null; save(state); draw(); inputs[0].focus(); }
    });
    draw();
  }

  /* ---------------------------------------------------------------------
     Knowledge checks: choose, see why; changing the answer is allowed.
     --------------------------------------------------------------------- */
  // knowledge checks per lesson; saved answers live under each lesson's own storage key (pp.l.<id>)
  const QUIZZES = {
  '01-01': [
    { q: '一本书里写道：“这个方法对所有人都有效。如果对你没有效果，说明你还不够相信它。”从科学的角度看，这句话最大的问题是什么？', from: 's2',
      o: [
        ['没有说明有多少人试过这个方法', '这确实是一个问题，但不是最根本的。即使试过的人再多，这句话依然无法被检验，因为任何结果都能被它解释过去。'],
        ['无论结果如何它都成立，所以无法被检验', '正确。方法有效，算方法的功劳；方法无效，就怪你不够相信。没有任何一种结果能证明它是错的，所以它实际上什么也没有告诉我们。这和福勒实验中那段“人人都觉得准”的性格分析是同一个问题。', true],
        ['作者没有交代自己的学历', '一个说法是否科学，并不取决于说话的人有什么学历，而取决于这个说法能否被检验。'],
      ] },
    { q: '研究发现，分散复习的平均效果比集中复习好。你的朋友说：“我一直都是考前突击，成绩也很好，所以这个研究是错的。”下面哪种回应最恰当？', from: 's6',
      o: [
        ['他一定是在夸大自己的成绩', '我们没有理由怀疑他的经历。问题不在于他说的是不是真的，而在于一个人的经历能不能推翻关于平均趋势的结论。'],
        ['研究说的是平均趋势，并不保证每个人都如此，个别例外推翻不了它', '正确。两组人的成绩有很大一部分是重叠的，集中复习的人里本来就会有成绩很好的人。而且，他如果改用分散复习，也许会考得更好，这一点只有通过比较才能知道。', true],
        ['那这个研究可能真的是错的', '个别例外恰恰是平均趋势允许出现的情况，并不构成反证。如果要质疑这个结论，需要的是更多、设计更好的研究，而不是一个人的经历。'],
      ] },
    { q: '某个预防青少年犯罪的项目宣传说：“参加过项目的孩子中，有八成后来没有再犯。”为什么仅凭这一点，还不能说明这个项目有效？', from: 's7',
      o: [
        ['因为八成还不够高', '比例的高低并不是关键。即使是九成，也同样说明不了问题，因为我们缺少用来比较的对象。'],
        ['因为不知道情况相似、但没有参加项目的孩子中，有多少人同样没有再犯', '正确。如果没有参加的孩子里也有八成甚至更多的人没有再犯，那么这个项目就没有效果，甚至可能有害。“恐吓从善”项目正是这样：只有和对照组比较之后，人们才发现它让情况变得更糟。', true],
        ['因为项目的花费没有公开', '花费会影响一个项目值不值得做，但并不影响它到底有没有效果。'],
      ] },
  ],
  '01-02': [
    { q: '朋友说：“每次我洗完车，第二天准下雨。”要判断这个说法是否成立，下面哪一项信息最关键？', from: 's2',
      o: [
        ['他洗车后第二天下雨的次数有多少', '这只是四格表中的一格。即使次数很多，如果不洗车的时候下雨的比例也一样高，洗车和下雨之间就没有任何关系。'],
        ['洗车后第二天下雨的比例，和不洗车时第二天下雨的比例，分别是多少', '正确。只有把四个格子都统计出来，比较两种情况下下雨的比例，才能判断两者是否有关。只记住“洗了车又下雨”的那几次，正是错觉相关产生的原因。', true],
        ['他记得最清楚的那一次，雨下得有多大', '印象最深的例子最容易被记住，但它恰恰最不能代表整体情况。'],
      ] },
    { q: '在“2，4，6”游戏中，你猜规则是“每次加 2”。下面哪一组数最能有效地检验你的猜想？', from: 's3',
      o: [
        ['10，12，14', '这组数符合你的猜想，但它也符合许多其他规则，比如“从小到大”。无论得到什么回答，你都很难区分不同的可能性。'],
        ['100，102，104', '这和上一个选项本质上一样，只是换了更大的数。得到“符合”会让你更有信心，却没有提供新的信息。'],
        ['1，5，13', '正确。按照你的猜想，这组数应该“不符合”。如果它实际上“符合”，你立刻就知道自己猜错了。主动去试可能推翻自己猜想的例子，才是有信息量的检验。', true],
      ] },
    { q: '你对多年前得知某个重大新闻时的情景记得非常清楚，并且十分确信。根据本讲介绍的研究，应该怎样看待这种确信？', from: 's5',
      o: [
        ['记得越清楚、越确信，说明记忆越准确', '研究发现，这类记忆的细节和普通记忆一样会随时间改变，只是人们对它的确信程度一直很高。确信程度并不能保证准确。'],
        ['确信感可能一直很强，但细节可能已经改变；如果有当时的记录，最好对照一下', '正确。“闪光灯记忆”的特别之处在于人们觉得它准确，而不在于它真的更准确。确定感是一种感觉，最好用客观记录来核对。', true],
        ['这种记忆一定是错的，完全不可信', '这样说太绝对了。研究说明的是确信感不能代替准确性，而不是说这类记忆全都是错的。'],
      ] },
  ],
  '01-03': [
    { q: '20 世纪初，依靠受训练观察者进行自我观察的方法逐渐被放弃。最主要的原因是什么？', from: 's3',
      o: [
        ['这种方法太耗费时间', '耗时并不是关键。真正的问题在于，它产生的证据无法让研究者解决彼此之间的分歧。'],
        ['不同实验室的观察者报告不一致，而内心体验只有本人能看到，分歧无法裁决', '正确。“无意象思维”之争就是一个例子：双方都无法核实对方观察者的体验，也就无法判断谁对谁错。一种无法裁决分歧的方法，在科学上很难走远。', true],
        ['冯特本人反对使用这种方法', '恰恰相反，受控制的自我观察正是冯特实验室的代表性方法之一。'],
      ] },
    { q: '行为主义和认知心理学都重视客观数据。两者最重要的区别是什么？', from: 's7',
      o: [
        ['认知心理学重新把内省作为主要证据', '认知心理学并没有回到内省法，它的证据仍然是反应时间、错误类型等客观的行为数据。'],
        ['认知心理学会根据行为数据推断记忆、注意等内部过程，而行为主义主张只研究环境与行为之间的关系', '正确。认知心理学继承了行为主义严格的方法，同时重新拾起了行为主义放弃的问题：头脑里发生了什么。', true],
        ['行为主义不做实验，只做观察', '行为主义非常重视严格控制的实验，桑代克的迷箱和斯金纳的研究都是实验。'],
      ] },
    { q: '赫尔姆霍兹测出了神经信号的传导速度。这件事对心理学的发展为什么重要？', from: 's2',
      o: [
        ['它证明了大脑的工作方式和计算机一样', '计算机在一百年后才出现。这项发现的意义在于说明神经和心理过程可以被测量。'],
        ['它说明心理和神经活动是在时间中发生的过程，可以被测量，为用实验研究心理打开了大门', '正确。康德曾认为心理无法测量，而这类研究证明至少有一部分心理现象可以用实验研究、用数字描述。反应时间至今仍是心理学最常用的指标之一。', true],
        ['它找到了意识在大脑中的具体位置', '测量神经传导速度和定位意识是两个不同的问题，这项研究并没有回答后者。'],
      ] },
  ],
  '01-04': [
    { q: '有人说：“弗洛伊德的思想影响了文学、电影和日常语言，所以他的理论一定基本正确。”这个推理的问题在哪里？', from: 's2',
      o: [
        ['没有问题，影响这么大的理论不可能是错的', '影响力反映的是一个理论传播得有多广、多有吸引力，而不是它是否经过了检验。'],
        ['影响力和证据是两个问题，一个理论传播得广，不等于它的具体说法得到了证据支持', '正确。评价一个理论要看它的具体说法有没有经过检验、检验结果如何，而不是看它有多出名。', true],
        ['问题在于弗洛伊德的理论太旧了', '理论的年代并不是关键。很多古老的发现至今仍然成立，关键在于证据。'],
      ] },
    { q: '一位治疗师说：“病人同意我的解释，说明我解释对了；病人强烈反对，说明他在抗拒，也说明我说对了。”这体现了什么问题？', from: 's3',
      o: [
        ['病人不够配合治疗', '问题不在病人身上，而在于这种推理方式本身。'],
        ['无论病人怎样反应，都被当作支持解释的证据，这使得解释无法被检验', '正确。如果同意和反对都能证明解释正确，那么就没有任何结果能证明它错了。这正是波普尔所批评的“什么都能解释”。', true],
        ['治疗师的经验还不够丰富', '经验再丰富，如果用这种方式推理，也无法发现自己的解释是不是错了。'],
      ] },
    { q: '研究显示，现代心理动力治疗对一些人有帮助。下面哪个结论最恰当？', from: 's5',
      o: [
        ['这证明弗洛伊德的理论是正确的', '疗法有效，并不能证明它背后的理论正确。病人好转可能有很多原因，比如得到理解和支持。'],
        ['这支持了这类疗法的效果，但不能直接证明弗洛伊德关于病因的理论', '正确。疗法的效果和理论的正确性是两个问题，需要分别用证据来回答。而且关于这类疗法效果的大小，目前也仍有讨论。', true],
        ['这些研究一定有问题，因为弗洛伊德的理论已经被否定了', '这同样是把理论和疗法混为一谈。现代心理动力治疗的效果需要看研究本身的质量，而不能根据对弗洛伊德理论的评价来下结论。'],
      ] },
  ],
  '02-01': [
    { q: '研究者从全国随机抽取了 1000 名大学生，然后让他们自己决定是否使用一种新的复习方法。一个月后，使用新方法的学生成绩更好。这个设计最主要的问题是什么？', from: 's3',
      o: [
        ['样本不是随机抽取的，结论无法推广', '样本恰恰是随机抽取的，这有助于推广结论。问题出在另一个环节：谁进入哪一组。'],
        ['分组不是随机的，两组学生可能本来就不同', '正确。随机抽样决定结论能推广到谁，随机分配才决定两组的差异能否归因于复习方法。自愿选择新方法的学生可能本来就更有动力。', true],
        ['1000 人太少，结果没有意义', '1000 人并不算少。即使人数再多，只要分组由学生自己决定，“两组本来就不同”这个解释依然无法排除。'],
      ] },
    { q: '一项实验中，上午班的学生使用新方法，下午班的学生使用旧方法，结果上午班成绩更好。为什么这个结果难以解释？', from: 's4',
      o: [
        ['因为上午和下午的天气可能不同', '天气只是可能的因素之一。更根本的问题是，“班级”和“时间段”都和复习方法同时变化。'],
        ['因为复习方法和班级、时间段混在了一起，无法分辨差异来自哪里', '正确。班级、上课时间、学生构成都和复习方法一起变化，它们都是混淆变量。更好的做法是在同一批学生中随机分配方法。', true],
        ['因为两个班的人数可能不一样', '人数不同会影响结果的精确度，但不是这个设计的主要问题。'],
      ] },
    { q: '在一项复习方法的实验中，研究者安排不知道学生分组情况的助手来批改试卷。这样做主要是为了什么？', from: 's5',
      o: [
        ['让批改速度更快', '批改速度和是否知道分组无关。'],
        ['防止批改者的期待不自觉地影响评分', '正确。这就是盲法。罗森塔尔的老鼠实验说明，研究者的期待可能在不知不觉中影响结果，让评分者不知道分组可以去掉这部分偏差。', true],
        ['保护学生的隐私', '保护隐私是研究伦理的要求，但这里让批改者不知道分组，主要目的是防止期待带来的偏差。'],
      ] },
  ],
  '02-02': [
    { q: '一份“领导力问卷”，同一批人隔两周重做，分数几乎完全一样；但问卷得分和这些人在工作中的实际领导表现几乎没有关系。下面哪种描述最恰当？', from: 's4',
      o: [
        ['信度高，效度也高', '分数稳定说明信度高，但它不能预测实际的领导表现，说明它很可能没有测到想测的东西。'],
        ['信度高，但效度存疑', '正确。这就像打靶图中的第二个靶子：很集中，但偏离了靶心。测得稳定，不等于测得对。', true],
        ['信度低，所以效度也低', '两周后分数几乎一样，说明信度并不低。'],
      ] },
    { q: '同一组人填写关于学业诚信的问卷，署名填写时报告的作弊次数，明显少于匿名填写时。最可能的原因是什么？', from: 's5',
      o: [
        ['匿名问卷的题目更难理解', '题目相同，只是署名方式不同，所以差异不太可能来自题目本身。'],
        ['社会赞许性偏差：署名时，人们更倾向于给出“好看”的回答', '正确。当回答会被别人看到时，人们更倾向于少报社会不认可的行为。匿名作答是减少这种偏差的常用方法之一。', true],
        ['署名的人记忆更准确', '没有理由认为署名会改善记忆。署名改变的是回答的动机。'],
      ] },
    { q: '朋友推荐了一个网上的性格测试，说“十几万人做过，大家都说特别准”。要判断这个测试是否可靠，下面哪个信息最关键？', from: 's6',
      o: [
        ['做过这个测试的人数', '做的人多只说明它流行，并不能说明它测得准。'],
        ['是否有公开的研究证据，说明它的信度和效度', '正确。“感觉准”可能只是福勒效应：描述放在谁身上都说得通。可靠的测验需要有证据表明它测量稳定，并且确实测到了它声称要测的东西。', true],
        ['测试结果的描述是否详细、生动', '描述越详细生动，越容易让人觉得“准”，但这和测验本身的信度、效度无关。'],
      ] },
  ],
  '02-03': [
    { q: '一项调查发现，感到孤独的人每天刷手机的时间更长。下面哪种说法最恰当？', from: 's2',
      o: [
        ['这证明刷手机会让人感到孤独', '这只是可能的解释之一。单凭一次调查中的相关，无法确定因果方向。'],
        ['也可能是孤独让人更多地刷手机，或者有第三个因素同时影响两者', '正确。反向因果和第三变量都可能产生这样的相关。要判断因果，需要纵向数据、自然实验或实验等更多证据。', true],
        ['这说明孤独和刷手机之间没有任何关系', '相关是真实存在的，只是它的原因还不清楚。'],
      ] },
    { q: '研究者想知道家庭收入是否影响儿童的心理健康。下面哪种研究设计，最有助于做出因果判断？', from: 's4',
      o: [
        ['在同一时间比较富裕家庭和贫困家庭孩子的心理状况', '这是横断比较。两类家庭在很多方面都不同，差异不一定来自收入本身。'],
        ['利用一项外部政策让部分家庭收入突然增加的机会，比较这些家庭孩子在政策前后的变化', '正确。这是自然实验的思路：收入的变化来自外部事件，而不是家庭本身的特点，因此更接近随机分配。当然，它仍然依赖“两组家庭本来相似”这一假设。', true],
        ['询问家长，认为收入对孩子有多大影响', '家长的看法是一种观点，不能作为因果关系的证据。'],
      ] },
    { q: '一项追踪研究发现：一年级时 A 水平较高的孩子，三年级时 B 也较高。这能否证明 A 导致了 B？', from: 's3',
      o: [
        ['能，因为 A 发生在 B 之前', '时间顺序是因果关系的必要条件，但不是充分条件。'],
        ['不能自动证明，因为稳定的第三变量（如家庭环境）可能同时影响 A 和后来的 B', '正确。纵向研究能确定先后顺序，但如果某个稳定的因素同时影响两者，仍然会产生“先 A 后 B”的模式。', true],
        ['不能，因为追踪研究完全没有用', '纵向研究很有价值，它能排除一部分解释，比如反向因果。只是它本身还不足以确定因果。'],
      ] },
  ],
  '02-04': [
    { q: '某心理筛查问卷能识别出 90% 真正有问题的人，误判率为 10%。在一个这种问题很少见的人群中，一个人筛查结果为阳性。下面哪种理解最恰当？', from: 's2',
      o: [
        ['他有 90% 的可能真的有这个问题', '这忽略了基础比率。当问题很少见时，没有问题的人数量多得多，即使误判率不高，也会产生大量假阳性。'],
        ['他真正有问题的可能性取决于这个问题在人群中有多常见，可能远低于 90%', '正确。用“1000 人中有多少人”的方式来想就会发现，在问题罕见时，阳性结果中有很大一部分是误判。', true],
        ['筛查结果没有任何意义', '阳性结果确实提高了有问题的可能性，只是没有想象中那么高。它通常意味着需要进一步评估。'],
      ] },
    { q: '一所学校挑出焦虑得分最高的 30 名学生参加减压课程。一个月后再测，他们的焦虑得分明显下降。下面哪种说法最恰当？', from: 's3',
      o: [
        ['这证明减压课程很有效', '可能有效，但仅凭前后对比无法确定。'],
        ['下降可能部分来自回归均值；需要一个同样挑选出来、但没有参加课程的对照组', '正确。挑选得分最极端的人，他们下一次的得分往往会自然回落。只有和对照组比较，才能分辨课程本身的作用。', true],
        ['这说明课程完全没有效果，下降只是回归均值', '回归均值不等于干预无效。它只说明前后对比本身不足以证明有效。'],
      ] },
    { q: '一项有 10 万名参与者的研究发现，某种习惯与幸福感之间的关系“极其显著”（p < .001），但效应量非常小。下面哪种理解最恰当？', from: 's5',
      o: [
        ['p 值这么小，说明这个习惯对幸福感有很大影响', '显著不等于效果大。样本很大时，很微小的差异也能达到显著。'],
        ['这个结果不太可能纯属偶然，但效果很小，实际意义需要另外判断', '正确。p 值回答的是“像不像偶然”，效应量回答的是“效果有多大”。这是两个不同的问题。另外，相关研究本身也不能说明因果方向。', true],
        ['p 值小于 .001，说明假设为真的概率超过 99.9%', 'p 值不是假设为真的概率。这是关于 p 值最常见的误解之一。'],
      ] },
  ],
  '02-05': [
    { q: '为什么期刊上发表的研究，报告的效应往往比真实效应更大？', from: 's2',
      o: [
        ['因为期刊只接受大样本研究', '情况往往相反：发表的研究中有不少是小样本研究。'],
        ['因为显著的结果更容易被发表，而小样本研究只有在估计碰巧偏高时才能达到显著', '正确。发表偏差和统计效力不足叠加在一起，会让文献中的效应被系统性地夸大。', true],
        ['因为研究者普遍有意造假', '造假确实存在，但很少见。效应被夸大的主要原因是发表偏差、分析的灵活性等系统性问题，它们并不需要任何人有意造假。'],
      ] },
    { q: '一个经典效应，在 23 个实验室按照事先登记的统一方案进行的重复研究中，得到的效应量接近零。下面哪种结论最恰当？', from: 's5',
      o: [
        ['原来的研究者一定造假了', '重复失败有很多可能的原因，比如发表偏差、原研究样本小、分析灵活等，不能直接推断为造假。'],
        ['这是有力的证据，表明按这种方案测得的效应很小或不存在；但不能自动推翻相关领域的所有理论问题', '正确。大规模、预注册的重复研究对这个具体效应构成了严重挑战，也对相关的理论模型不利；但它检验的是一种具体方案，更广泛的问题仍需单独研究。', true],
        ['这说明心理学不是科学', '恰恰相反，能够组织大规模重复研究、公开报告不利结果，正是科学自我纠错的表现。'],
      ] },
    { q: '研究者在收集数据之前，就公开登记研究假设、样本量和分析方法。这样做主要能解决什么问题？', from: 's6',
      o: [
        ['保证研究结果一定是显著的', '预注册不保证任何结果。注册报告中阳性结果的比例反而低得多。'],
        ['区分事先计划的检验和看到数据后的探索，减少分析上的灵活性和选择性报告', '正确。预注册让读者知道哪些分析是事先计划的，从而减少“看到数据再决定怎么分析”带来的误报。', true],
        ['让研究可以不需要伦理审查', '预注册和伦理审查是两回事，预注册并不能代替伦理审查。'],
      ] },
  ],
  };
  const QUIZ = QUIZZES[id] || [];

  function checks(host) {
    // 01-01 keeps its answers under 'quiz3' (its earlier 5-question set used 'quiz')
    const QK = id === '01-01' ? 'quiz3' : 'quiz';
    const ans = state[QK] || {};
    host.className = 'l-quiz';
    host.innerHTML = QUIZ.map((x, i) => `
      <fieldset class="l-q" data-i="${i}">
        <legend><span class="lab">问题 ${i + 1} / ${QUIZ.length}</span>${x.q}</legend>
        <div class="l-opts">${x.o.map((o, j) => `
          <label class="l-opt"><input type="radio" name="q${i}" value="${j}"><span>${o[0]}</span></label>`).join('')}
        </div>
        <div class="l-fb" aria-live="polite"></div>
      </fieldset>`).join('') + '<p class="l-score" aria-live="polite"></p>';

    const show = (i) => {
      const fs = host.querySelector(`.l-q[data-i="${i}"]`), j = ans[i];
      if (j == null) return;
      const o = QUIZ[i].o[j];
      fs.querySelector(`input[value="${j}"]`).checked = true;
      fs.querySelectorAll('.l-opt').forEach((l, k) => { l.classList.toggle('is-right', k === j && !!o[2]); l.classList.toggle('is-wrong', k === j && !o[2]); });
      fs.querySelector('.l-fb').innerHTML = `<p><b>${o[2] ? '' : '再想一想。'}</b>${o[1]}</p>${o[2] ? '' : `<p class="l-fb-back"><a href="#${QUIZ[i].from}">回到相应的小节</a></p>`}`;
    };
    const score = () => {
      const done = Object.keys(ans).length, right = Object.entries(ans).filter(([i, j]) => QUIZ[i].o[j][2]).length;
      host.querySelector('.l-score').textContent = done === QUIZ.length ? `答对 ${right} / ${QUIZ.length}。${right === QUIZ.length ? '这一讲的核心内容，你已经掌握了。' : '答错的题目，可以回到相应的小节再读一读。'}` : '';
    };
    host.addEventListener('change', (e) => {
      const fs = e.target.closest('.l-q');
      ans[fs.dataset.i] = +e.target.value;
      if (QK !== 'quiz') delete state.quiz;
      state[QK] = ans; save(state);
      show(+fs.dataset.i); score();
    });
    QUIZ.forEach((_, i) => show(i));
    score();
  }
})();
