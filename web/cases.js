/* PsychoPilot — Cases (catalog v0.4, sealed: 23 planned, listed here only once written). Original novellas built on psychology,
   each followed by Case Notes (fiction vs. documented, the research behind each turn, questions,
   references). Manuscripts live in cases/<id>.html and are read by lesson.js through case.html?id=<id>. */
window.PPCases = (() => {
  'use strict';
  const cases = [
    { id: 'c1', title: '第七份证词', genre: '司法心理学', sub: '六个证人说法越来越一致，第七个证人坚持另一种说法' },
    { id: 'c2', title: '夜班', genre: '精神医学', sub: '一个吃了十二年锂盐的老病人在急诊唱戏，所有人都以为她又发病了' },
    { id: 'c3', title: '完美公司的秘密', genre: '组织心理学', sub: '一家人人都说自己满意的公司，系统崩溃前，没有一个人把知道的事说出口' },
    { id: 'c4', title: '消失的显著性', genre: '复制危机', sub: '一个写进教材的发现，在博士生的重复实验里消失了；没有人造假，可每个人都得重新回答它到底说明了什么' },
    { id: 'c5', title: '无限滚动', genre: '行为科学', sub: '一张只说下一件事的卡片，让人再也不会错过什么；可当他想离开，整座城市都在替它把预言变成真的' },
    { id: 'c6', title: '第三考场', genre: '学校心理学', sub: '一模随机排座，她被分进旧楼的第三考场；那一年，一沓卡片、一间旧实验室和一通凌晨两点的电话，让她重新回答自己是谁' },
    { id: 'c7', title: '情书算法', genre: '婚恋应用研究', sub: '六封信让两个陌生人以为看见了彼此；见面以后，他们才开始学怎样读懂一段沉默' },
    { id: 'c8', title: '测量心灵的人', genre: '实验心理学史', sub: '巴黎，1908 年：一个读不好书的洗衣妇女儿，两张测验表，和一群想替她做决定的大人' },
    { id: 'c9', title: '全镇最烂的话剧团', genre: '社会心理学', sub: '连续九年垫底的业余剧社排《麦克白》：贡献表加起来 240%，每个人都在悄悄补救别人的错' },
    { id: 'c10', title: '第七夜的客人', genre: '睡眠与意识', sub: '远野山村的老民宿，每间客房都压着一张卡片：夜里有人叫你的名字，不要应' },
    { id: 'c11', title: '泥地', genre: '运动与团队心理学', sub: '灯被剪了，球队在车灯底下训练；半决赛那天，他们的十号在内地参加职业选拔' },
    { id: 'c12', title: '愿望只能买半个', genre: '情绪与社会心理学', sub: '国王许愿要全城的人都爱他，从此只剩一个学徒能对他说“不”' },
    { id: 'c13', title: '城里没有妖怪', genre: '传言与群体心理', sub: '京城闹黑眚的消息传到县城，十二岁的打更孩子说了一句话，怀疑落在了收生婆身上' },
    { id: 'c14', title: '表情说明书', genre: '情绪识别与跨文化沟通', sub: '外星人带着一本六张脸的说明书来到釜山，读出的第一张脸是一个聋人老头的欢呼，读成了“怒”' },
    { id: 'c15', title: '她回来的三天', genre: '自传体记忆与哀伤', sub: '亡灵节的中午，死去六年的妻子回到瓦哈卡的厨房，嫌咖啡太淡；她记得的那段婚姻，跟丈夫记得的不一样' },
    { id: 'c16', title: '海底没有星星', genre: '知觉与社会规范', sub: '深海采矿船从四千三百米的海底捡上来一块石头，每个人在上面看见的都不一样；第九天起，所有人看见了同一样东西' },
    { id: 'c17', title: '皇帝决定当普通人', genre: '层级沟通与组织沉默', sub: '官家想微服出宫吃一碗面，看看二十二年前那幅画上的街市是不是真的；一句“谁也不许知道”，让全城照着画改了一遍' },
    { id: 'c18', title: '笑声传过山谷', genre: '群体性心因性疾病', sub: '一九六二年，刚刚独立的坦噶尼喀，一所女子中学里，一百五十九个女孩有九十五个先后笑着哭着停不下来；医生什么都没查出来' },
    { id: 'c19', title: '人民公园的星期六', genre: '晚年亲密关系与家庭边界', sub: '两个替孩子相亲的上海老人，为了香樟树底下一张长椅吵了一个春天；孩子们彼此不来电，两个老的倒是越吵越离不开' },
    { id: 'c20', title: '第二只手', genre: '幻肢、身体拥有感与作者身份', sub: '替大师雕了三十年石头的手艺人失去了左手；那只手还攥着拳，工坊里没做完的雕像却在没人的夜里继续变' },
    { id: 'c21', title: '雪线以上还有一个人', genre: '存在感体验、高海拔认知与不确定下的决策', sub: '一九八八年冬天，一个巴尔蒂高山协作和一个波兰登山者被困在六千米的雪洞里；两个人都觉得洞里还有第三个人，一个叫她往上，一个叫他往下' },
  ];
  const READY = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14', 'c15', 'c16', 'c17', 'c18', 'c19', 'c20', 'c21']; // ids whose manuscript is finished and approved for reading
  cases.forEach((c, i) => { c.index = i; c.no = String(i + 1).padStart(2, '0'); c.ready = READY.includes(c.id); });
  const byId = (id) => cases.find((c) => c.id === id);
  const caseUrl = (c) => `case.html?id=${c.id}`;
  return { cases, byId, caseUrl };
})();
