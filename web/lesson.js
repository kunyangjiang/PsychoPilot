/* PsychoPilot — lesson reader. Loads a written lesson into course.html (if one exists for this id),
   numbers its sections, builds a contents list, links [n] citations, and fills in the lesson's
   demonstration and knowledge checks. Lessons without a manuscript keep the "in preparation" page. */
(() => {
  'use strict';
  const READY = { '01-01': 'lessons/01-01.html', '01-02': 'lessons/01-02.html', '01-03': 'lessons/01-03.html', '01-04': 'lessons/01-04.html' };

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
