/* PsychoPilot — Cases (catalog v0.3, sealed). Eight original novellas set in psychology work,
   each followed by Case Notes (fiction vs. documented, the research behind each turn, questions,
   references). Manuscripts live in cases/<id>.html and are read by lesson.js through case.html?id=<id>. */
window.PPCases = (() => {
  'use strict';
  const cases = [
    { id: 'c1', title: '第七份证词', genre: '司法心理学 · 犯罪推理', sub: '六个证人说法越来越一致，第七个证人坚持另一种说法' },
    { id: 'c2', title: '夜班', genre: '精神医学 · 医疗群像', sub: '一个吃了十二年锂盐的老病人在急诊唱戏，所有人都以为她又发病了' },
    { id: 'c3', title: '完美公司的秘密', genre: '组织心理学 · 职场惊悚', sub: '一家人人都说自己满意的公司，系统崩溃前，没有一个人把知道的事说出口' },
    { id: 'c4', title: '消失的显著性', genre: '复制危机 · 学术剧' },
    { id: 'c5', title: '无限滚动', genre: '行为科学 · 科技伦理' },
    { id: 'c6', title: '第三考场', genre: '学校心理学 · 青春成长' },
    { id: 'c7', title: '情书算法', genre: '婚恋应用研究 · 都市爱情' },
    { id: 'c8', title: '测量心灵的人', genre: '实验心理学史 · 历史小说' },
  ];
  const READY = ['c1', 'c2', 'c3']; // ids whose manuscript is finished and approved for reading
  cases.forEach((c, i) => { c.index = i; c.no = String(i + 1).padStart(2, '0'); c.ready = READY.includes(c.id); });
  const byId = (id) => cases.find((c) => c.id === id);
  const caseUrl = (c) => `case.html?id=${c.id}`;
  return { cases, byId, caseUrl };
})();
