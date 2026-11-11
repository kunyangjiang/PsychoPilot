/* PsychoPilot — Cases (catalog v0.3, sealed). Eight original novellas set in psychology work,
   each followed by Case Notes (fiction vs. documented, the research behind each turn, questions,
   references). Manuscripts live in cases/<id>.html and are read by lesson.js through case.html?id=<id>. */
window.PPCases = (() => {
  'use strict';
  const cases = [
    { id: 'c1', title: '第七份证词', genre: '司法心理学 · 犯罪推理', sub: '六个证人说法越来越一致，第七个证人坚持另一种说法' },
    { id: 'c2', title: '夜班', genre: '精神医学 · 医疗群像', sub: '一个吃了十二年锂盐的老病人在急诊唱戏，所有人都以为她又发病了' },
    { id: 'c3', title: '完美公司的秘密', genre: '组织心理学 · 职场惊悚', sub: '一家人人都说自己满意的公司，系统崩溃前，没有一个人把知道的事说出口' },
    { id: 'c4', title: '消失的显著性', genre: '复制危机 · 学术剧', sub: '一个写进教材的发现，在博士生的重复实验里消失了；没有人造假，可每个人都得重新回答它到底说明了什么' },
    { id: 'c5', title: '无限滚动', genre: '行为科学 · 科技伦理', sub: '一张只说下一件事的卡片，让人再也不会错过什么；可当他想离开，整座城市都在替它把预言变成真的' },
    { id: 'c6', title: '第三考场', genre: '学校心理学 · 青春成长', sub: '一模随机排座，她被分进旧楼的第三考场；那一年，一沓卡片、一间旧实验室和一通凌晨两点的电话，让她重新回答自己是谁' },
    { id: 'c7', title: '情书算法', genre: '婚恋应用研究 · 都市爱情', sub: '六封信让两个陌生人以为看见了彼此；见面以后，他们才开始学怎样读懂一段沉默' },
    { id: 'c8', title: '测量心灵的人', genre: '实验心理学史 · 历史小说', sub: '巴黎，1908 年：一个读不好书的洗衣妇女儿，两张测验表，和一群想替她做决定的大人' },
  ];
  const READY = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']; // ids whose manuscript is finished and approved for reading
  cases.forEach((c, i) => { c.index = i; c.no = String(i + 1).padStart(2, '0'); c.ready = READY.includes(c.id); });
  const byId = (id) => cases.find((c) => c.id === id);
  const caseUrl = (c) => `case.html?id=${c.id}`;
  return { cases, byId, caseUrl };
})();
