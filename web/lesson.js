/* PsychoPilot — lesson reader. Loads a written lesson into course.html (if one exists for this id),
   numbers its sections, builds a contents list, links [n] citations, and fills in the lesson's
   demonstration and knowledge checks. Lessons without a manuscript keep the "in preparation" page. */
(() => {
  'use strict';
  const READY = { '01-01': 'lessons/01-01.html' };

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
    body.querySelectorAll('section:not(.l-refs) p, section:not(.l-refs) td').forEach((el) => {
      el.innerHTML = el.innerHTML.replace(/\[(\d{1,2})\]/g, '<a class="cite" href="#ref-$1" aria-label="参考文献 $1">[$1]</a>');
    });

    const wrap = document.createElement('div');
    wrap.className = 'l-body';
    wrap.append(toc, body);
    $('#lesson').replaceWith(wrap);
    document.querySelectorAll('.stamp, .l-note').forEach((el) => el.remove());

    const demo = $('[data-demo="obvious"]', body);
    if (demo) obvious(demo);
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
     Knowledge checks: choose, see why; changing the answer is allowed.
     --------------------------------------------------------------------- */
  const QUIZ = [
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
  ];

  function checks(host) {
    const ans = state.quiz3 || {}; // answers by question index; the earlier 5-question set used state.quiz
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
      delete state.quiz; state.quiz3 = ans; save(state);
      show(+fs.dataset.i); score();
    });
    QUIZ.forEach((_, i) => show(i));
    score();
  }
})();
