import { questions, calculate, selectedOptions, answerLabel, contribution } from './model.js?v=wjx-20261023';

const dimensionDefinitions = [
  { title: '观看节奏', left: '随手刷 S', right: '深潜刷 D', leftShort: '随手刷', rightShort: '深潜刷', descriptions: ['你更常把观看安排在生活的间隙，短一点、重点先到的内容更合拍。', '遇到感兴趣的内容，你更愿意停下来，跟着完整的讲述多看一会儿。'], balanced: '你既会利用零碎时间看内容，也会为感兴趣的话题停留，观看节奏随情境切换。' },
  { title: '内容动机', left: '信息脑 I', right: '情绪脑 E', leftShort: '信息脑', rightShort: '情绪脑', descriptions: ['你更希望看完有所获得：一条新消息、一个知识点，或一个实用答案。', '放松、陪伴和共鸣更能吸引你，内容带来的感受和信息一样重要。'], balanced: '新知识与好心情都能让你留下来，这次回答没有呈现明显的单侧倾向。' },
  { title: '表达关注', left: '专业清晰 W', right: '轻松共鸣 M', leftShort: '专业清晰', rightShort: '轻松共鸣', descriptions: ['你更关注声音、表达功底、内容价值与真实可信，清楚扎实的讲述更值得尝试。', '共情与轻松解压更能让你留下来，讲述带来的感受对你很重要。'], balanced: '专业表达与轻松共鸣都能吸引你，这次回答在两边都有线索。' },
  { title: '互动方式', left: '潜水陪伴 Q', right: '扩音互动 V', leftShort: '潜水陪伴', rightShort: '扩音互动', descriptions: ['你更习惯安静地看、听或划过，不一定需要把每次观看都变成一场讨论。', '看完之后，你更愿意做出回应或继续探索，有时也会把话题带给同学。'], balanced: '安静观看与主动回应在这次回答中接近，暂时不必把自己归到某一边。' },
];

const hostProfiles = [
  { id: 'clear', title: '清晰干货型', summary: '先给结论，再把要点讲清楚。内容有条理，比花哨的包装更能留住你。', format: '校园资讯速报、知识清单、实用问题解答', sample: '这场讲座值不值得去？先看主题、适合谁，再看报名时间。', tags: ['重点先到', '逻辑清楚'] },
  { id: 'warm', title: '真诚陪伴型', summary: '像同学聊天一样自然，不端着、不催着认同，给你的感受留一点空间。', format: '校园日常访谈、下饭聊天、夜间陪伴口播', sample: '今天先不赶进度，聊聊最近让你松一口气的校园小事。', tags: ['自然聊天', '有共鸣'] },
  { id: 'humor', title: '轻松有梗型', summary: '节奏轻快，笑点贴近生活；能活跃气氛，也懂得把玩笑停在舒服的边界里。', format: '晚会互动、校园小剧场、轻松话题口播', sample: '当你以为只看一分钟，室友已经问了三遍：还去吃饭吗？', tags: ['节奏轻快', '幽默有分寸'] },
  { id: 'opinion', title: '观点表达型', summary: '观点鲜明，也能把理由讲明白。替你说出想法，比一味迎合更有吸引力。', format: '校园议题讨论、热点点评、观点访谈', sample: '社团越多越好？先聊聊你真正愿意把时间花在哪里。', tags: ['有态度', '讲道理'] },
  { id: 'story', title: '沉浸叙事型', summary: '用人物、细节和情绪把故事讲完整，让你愿意多停一会儿。', format: '校园人物故事、毕业季访谈、经历分享', sample: '从第一次走进社团教室开始，讲讲这段经历怎样改变了一个普通的下午。', tags: ['有细节', '故事感'] },
  { id: 'steady', title: '专业播讲型', summary: '声音清楚、普通话自然、表达有节奏，让内容容易听懂，也值得认真听完。', format: '校园广播、主题朗读、资讯播讲', sample: '用清楚的声音讲完一件事，让每个重点都能被听见。', tags: ['表达扎实', '声音清楚'] },
];

// Suggestions based on content interests and reasons for watching, not direct host-style measurements.
const hostSignals = {
  7: [{ humor: 2 }, { clear: 2 }, { warm: 1, story: 1 }, { opinion: 1 }, { story: 2 }, { clear: 1 }, {}],
  8: [{ steady: 3 }, { clear: 3 }, { warm: 3 }, {}, { humor: 3 }, { clear: 1, warm: 1 }],
  13: [{ clear: 2 }, { warm: 2 }, { steady: 1 }, {}, {}],
};
const avoidance = [
  { title: '少一点硬广，多一点内容', text: '你最不想点开过度营销的口播。推荐理由清楚、内容与推广容易区分的表达，可能更适合你。' },
  { title: '可以有观点，不必制造对立', text: '你不喜欢刻意引战、煽动矛盾的口播。能交代事实、容纳不同看法的讨论更值得尝试。' },
  { title: '内容有依据，表达有分量', text: '空洞流水账、片面信息和谣言是你最想避开的内容。可以优先找说明来源、讲清理由的讲述。' },
  { title: '轻松有趣，也要有分寸', text: '你不喜欢低俗博眼球的表达。幽默可以贴近校园生活，也可以尊重人物与观众。' },
  { title: '你的观看边界由你决定', text: '你选择了“其他”，这次不替你补充具体雷点。遇到不喜欢的内容，换一个就好。' },
];
function answerEvidence(answers, index) {
  return { index, question: questions[index][0], answer: answerLabel(answers, index) };
}
function buildHost(answers, hidden) {
  const totals = Object.fromEntries(hostProfiles.map(profile => [profile.id, 0]));
  const evidence = [];
  if (!hidden) for (const [questionIndex, choices] of Object.entries(hostSignals)) {
    const index = Number(questionIndex), selected = selectedOptions(answers, index);
    let supported = false;
    for (const option of selected) for (const [id, points] of Object.entries(choices[option])) {
      totals[id] += points / selected.length; supported = true;
    }
    if (supported) evidence.push(answerEvidence(answers, index));
  }
  const ranked = hostProfiles.map(profile => ({ ...profile, points: totals[profile.id] })).filter(profile => profile.points > 0).sort((a, b) => b.points - a.points);
  const topScore = ranked[0]?.points;
  const tied = ranked.filter(profile => Math.abs(profile.points - topScore) < 1e-9).length;
  return {
    status: hidden ? 'limited' : ranked.length ? 'matched' : 'open',
    title: hidden ? '先从感兴趣的内容开始' : !ranked.length ? '你的表达偏好还有探索空间' : tied > 1 ? '这几种表达都值得试试' : `可以先试试${ranked[0].title}`,
    intro: hidden ? '你选择了“基本不看”，后续偏好题已跳过。这次先不推断主持风格，遇到感兴趣的内容再慢慢发现。' : '结合你常看的内容、愿意继续观看的原因和主要目的，给你几种可以尝试的表达方式。问卷没有直接询问主持风格，因此这里是内容建议，不是确定的风格测量。',
    recommendations: hidden ? [] : ranked.slice(0, Math.max(2, tied)).map(profile => ({ ...profile, primary: Math.abs(profile.points - topScore) < 1e-9 })),
    exploration: !hidden && !ranked.length ? hostProfiles.filter(profile => ['clear', 'warm', 'humor'].includes(profile.id)) : [],
    evidence: hidden ? [] : evidence,
    avoidance: hidden ? null : avoidance[answers[9]],
  };
}
function buildScenes(answers, result) {
  if (result.hidden) return [{ title: '按自己的需要接触内容', text: '你不需要为了参与而增加观看时间。校园通知、同学推荐，或刚好感兴趣的话题，按需看看就好。' }];
  const times = [
    { title: '早间与上下课路上', text: '适合可以随时暂停的口播，先听一个重点，也给路况和周围的提醒留一点注意。' },
    { title: '午间与用餐时刻', text: '轻松、条理清楚的内容可以陪你吃完一顿饭，感兴趣的话题也可以先收藏。' },
    { title: '晚间休闲时段', text: '按兴趣挑一段内容，看看知识讲解、访谈或故事，哪一种更让你愿意停留。' },
    { title: '睡前放松时刻', text: '选择让你舒服的声音与节奏，也可以给自己留一个结束点，把想看的内容留到明天。' },
    { title: '刷到就看的随机时刻', text: '你的接触时间没有固定安排。让主题和当下的需要决定是否继续看，不必每次都追完。' },
  ];
  const scenes = selectedOptions(answers, 5).map(option => times[option]);
  if (selectedOptions(answers, 7).includes(5)) scenes.push({ title: '校园资讯与活动', text: '你常看校园专属内容。时间、地点、参与方式清楚的通知，能帮助你更快决定下一步。' });
  return scenes;
}
function buildInsights(answers) {
  const result = calculate(answers);
  const dimensions = dimensionDefinitions.map((definition, dimensionIndex) => {
    const evidence = result.hidden ? [] : answers.flatMap((_, index) => {
      const value = contribution(answers, index, dimensionIndex);
      return value.total ? [{ ...answerEvidence(answers, index), direction: Math.abs(value.sum) < 1e-9 ? '两边都有线索' : `更靠近${value.sum > 0 ? definition.leftShort : definition.rightShort}` }] : [];
    });
    const status = result.hidden ? 'limited' : !result.total[dimensionIndex] ? 'unknown' : result.pct[dimensionIndex] === 50 ? 'balanced' : 'leaning';
    const leftPercent = ['limited', 'unknown'].includes(status) ? null : result.pct[dimensionIndex];
    const label = status === 'limited' ? '暂不判断' : status === 'unknown' ? '偏好还不明显' : status === 'balanced' ? '两边都合拍' : `更偏向${leftPercent > 50 ? definition.leftShort : definition.rightShort}`;
    const description = status === 'limited' ? '你选择了“基本不看”，相关问题没有继续作答，这一维暂不判断。' : status === 'unknown' ? '这次回答没有提供足够的相关线索，可以保留开放的可能，不必急着归类。' : status === 'balanced' ? definition.balanced : definition.descriptions[leftPercent > 50 ? 0 : 1];
    return { ...definition, id: dimensionIndex, status, leftPercent, label, description, evidence, note: dimensionIndex === 3 ? '这一维参考第 13 题的观看后行为，线索较少，适合轻松参考。' : `参考了 ${evidence.length} 道相关回答；多选题按题内平均计入，避免多选就获得更高权重。` };
  });
  const summary = result.hidden ? '你选择了“基本不看”这类内容，所以本次测试在第 4 题结束。保持自己的观看节奏就好，剩下的偏好无需猜测。' : dimensions.filter(dimension => dimension.status === 'leaning').map(dimension => dimension.description).join('') || '你的回答没有呈现明显的单侧倾向。可以随内容、心情和场景选择自己的观看方式。';
  const interaction = answers[12];
  const buddy = result.hidden ? '找一个消息灵通、又不会催你参与的同学，需要时交换重点，平时各有自己的节奏。' : interaction === 3 ? '找愿意交换内容的同学，你分享一个话题，TA带来一个新角度，一起把讨论接下去。' : interaction === 2 ? '找愿意认真聊两句的朋友，可以有不同看法，也能让每个人把话说完。' : interaction === 1 ? '找兴趣相近的同学，偶尔交换收藏和推荐，不必每次都热聊，也能一起发现好内容。' : '找相处轻松的观看搭子，想聊时接得上，安静看一会儿也不尴尬。';
  const tagPairs = [['碎片冲浪', '沉浸观看'], ['信息捕手', '共鸣充电'], ['专业清晰', '轻松共鸣'], ['安静在线', '互动分享']];
  const supportedTags = [0,1,3,2].flatMap(index => dimensions[index].status === 'leaning' ? [tagPairs[index][dimensions[index].leftPercent > 50 ? 0 : 1]] : []).slice(0,3);
  const tags = result.hidden ? ['自带节奏','轻量接触','自在观察'] : supportedTags.length ? supportedTags : ['偏好开放','慢慢探索'];
  const agreement = ['完全不同意','不同意','中立','同意','完全同意'];
  const observations = result.hidden ? [] : [
    { title: '内容与认知', text: `对“内容传递审美、观念，拓宽认知”，你选择了 ${answers[10] + 1} / 5（${agreement[answers[10]]}）。这是你对内容作用的感受，不是认知能力评分。`, index: 10 },
    { title: '商业推广感知', text: `对“很多口播内容藏着商业推广目的”，你选择了 ${answers[11] + 1} / 5（${agreement[answers[11]]}）。它描述你的观看感受，不用于给你贴性格标签。`, index: 11 },
    { title: '你更信任的来源', text: answerLabel(answers,14), index: 14 },
    { title: '你的内容入口', text: `首选：${answerLabel(answers,4)}。其他渠道：${answerLabel(answers,15)}。`, index: 15 },
  ];
  return { result, dimensions, host: buildHost(answers,result.hidden), scenes: buildScenes(answers,result), summary, buddy, tags, observations };
}
export { buildInsights };
