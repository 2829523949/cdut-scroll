import { questions, score, calculate } from './model.js';

const dimensionDefinitions = [
  { title: '观看节奏', left: '随手刷 S', right: '深潜刷 D', leftShort: '随手刷', rightShort: '深潜刷', descriptions: ['你更常把观看安排在生活的间隙，短一点、重点先到的内容更合拍。', '遇到感兴趣的内容，你更愿意停下来，跟着完整的讲述多看一会儿。'], balanced: '你既会利用零碎时间看内容，也会为感兴趣的话题停留，观看节奏随情境切换。' },
  { title: '内容动机', left: '信息脑 I', right: '情绪脑 E', leftShort: '信息脑', rightShort: '情绪脑', descriptions: ['你更希望看完有所获得：一条新消息、一个知识点，或一个实用答案。', '放松、陪伴和共鸣更能吸引你，内容带来的感受和信息一样重要。'], balanced: '新知识与好心情都能让你留下来，这次回答没有呈现明显的单侧倾向。' },
  { title: '表达口味', left: '暖场稳场 W', right: '梗场犀利 M', leftShort: '暖场稳场', rightShort: '梗场犀利', descriptions: ['自然、清晰、让人安心的表达更合你的口味，讲述者不必时刻抢镜。', '有梗、有态度的表达更容易抓住你，鲜明的观点和节奏会让你记住内容。'], balanced: '你对温和清晰与有梗有态度的表达都能接受，具体还要看内容和场景。' },
  { title: '互动方式', left: '潜水陪伴 Q', right: '扩音互动 V', leftShort: '潜水陪伴', rightShort: '扩音互动', descriptions: ['你更习惯安静地看、听或划过，不一定需要把每次观看都变成一场讨论。', '看完之后，你更愿意做出回应或继续探索，有时也会把话题带给同学。'], balanced: '安静观看与主动回应在这次回答中接近，暂时不必把自己归到某一边。' },
];

const hostProfiles = [
  { id: 'clear', title: '清晰干货型', summary: '先给结论，再把要点讲清楚。内容有条理，比花哨的包装更能留住你。', format: '校园资讯速报、知识清单、实用问题解答', sample: '这场讲座值不值得去？先看主题、适合谁，再看报名时间。', tags: ['重点先到', '逻辑清楚'] },
  { id: 'warm', title: '真诚陪伴型', summary: '像同学聊天一样自然，不端着、不催着认同，给你的感受留一点空间。', format: '校园日常访谈、下饭聊天、夜间陪伴口播', sample: '今天先不赶进度，聊聊最近让你松一口气的校园小事。', tags: ['自然聊天', '有共鸣'] },
  { id: 'humor', title: '轻松有梗型', summary: '节奏轻快，笑点贴近生活；能活跃气氛，也懂得把玩笑停在舒服的边界里。', format: '晚会互动、校园小剧场、轻松话题口播', sample: '当你以为只看一分钟，室友已经问了三遍：还去吃饭吗？', tags: ['节奏轻快', '幽默有分寸'] },
  { id: 'opinion', title: '观点表达型', summary: '观点鲜明，也能把理由讲明白。替你说出想法，比一味迎合更有吸引力。', format: '校园议题讨论、热点点评、观点访谈', sample: '社团越多越好？先聊聊你真正愿意把时间花在哪里。', tags: ['有态度', '讲道理'] },
  { id: 'story', title: '沉浸叙事型', summary: '用人物、细节和情绪把故事讲完整，让你愿意多停一会儿。', format: '校园人物故事、毕业季访谈、经历分享', sample: '从第一次走进社团教室开始，讲讲这段经历怎样改变了一个普通的下午。', tags: ['有细节', '故事感'] },
  { id: 'steady', title: '稳场控场型', summary: '衔接清楚、临场从容，让现场的每个人都知道接下来发生什么。', format: '校园晚会、赛事串场、正式活动主持', sample: '先把接下来的流程说清楚，也给正在准备的同学一点从容的时间。', tags: ['稳住节奏', '照顾现场'] },
];

// Direct style choices only. Person categories are never used as a personality proxy.
const hostSignals = {
  5: [{ clear: 3 }, { warm: 3 }, { humor: 3 }, { clear: 3 }, { warm: 3 }, {}],
  6: [{ humor: 2 }, { humor: 2 }, { clear: 3 }, { warm: 3 }, { opinion: 3 }, { story: 3 }, {}],
  8: [{ steady: 3 }, { humor: 3 }, { warm: 3 }, { clear: 3 }, { humor: 3 }, {}],
  12: [{ opinion: 4 }, { steady: 4 }, { humor: 4 }, { clear: 4 }, { warm: 4 }, { warm: 2, story: 2 }, {}],
};

const avoidance = [
  { title: '开场别绕弯', text: '你选择了“开头太磨叽”。更合拍的开场会先抛出问题或重点，再补充背景。' },
  { title: '交流，少一点说教', text: '你更在意语气是否平等。给出理由和选择空间，比替观众下判断更舒服。' },
  { title: '给你一点新东西', text: '你容易被重复的信息劝退。新角度、具体细节和实用更新更值得你停留。' },
  { title: '表达要对味', text: '讲述者的风格会影响你是否继续看。可以先试试下面几种推荐，再找最舒服的节奏。' },
  { title: '画面清爽，重点清楚', text: '你更需要整洁的字幕与画面，让信息容易找到，而不是被装饰淹没。' },
  { title: '先有内容，再谈推荐', text: '过强的广告感会影响你的观看意愿。表达真实、推荐理由明确的内容更容易被接受。' },
  { title: '你愿意多给一点时间', text: '你选择了“一般不划走”，这次没有明显的观看雷点，不必额外替自己设限。' },
];

function answerEvidence(answers, index) {
  return { index, question: questions[index][0], answer: questions[index][1][answers[index]] };
}

function buildHost(answers, hidden) {
  const totals = Object.fromEntries(hostProfiles.map(profile => [profile.id, 0]));
  const evidence = [];
  for (const [questionIndex, choices] of Object.entries(hostSignals)) {
    const index = Number(questionIndex);
    const signal = choices[answers[index]];
    if (Object.keys(signal).length) evidence.push(answerEvidence(answers, index));
    for (const [id, points] of Object.entries(signal)) totals[id] += points;
  }
  const ranked = hostProfiles.map(profile => ({ ...profile, points: totals[profile.id] })).filter(profile => profile.points > 0).sort((a, b) => b.points - a.points);
  const topScore = ranked[0]?.points;
  const tied = ranked.filter(profile => profile.points === topScore).length;
  // Keep all joint leaders rather than resolving ties into a fabricated preference.
  const recommendations = ranked.slice(0, Math.max(2, tied)).map(profile => ({ ...profile, primary: profile.points === topScore }));
  return {
    status: hidden ? 'limited' : ranked.length ? 'matched' : 'open',
    title: hidden ? '先从感兴趣的内容开始' : !ranked.length ? '你的风格偏好还很开放' : tied > 1 ? '这几种风格同样合拍' : `更合拍的可能是${ranked[0].title}`,
    intro: hidden ? '你这段时间接触相关内容较少，先不替你选定主持风格。遇到喜欢的内容后，再观察是什么让你留下来。' : !ranked.length ? '你在相关题目里没有选择明确的风格偏好。可以分别试试清晰、陪伴和幽默的表达，喜欢哪种都很自然。' : '根据你对主持表达、口播形式、校园主持和理想特质的选择整理。它们是这次回答的线索，不是固定标签。',
    recommendations: hidden ? [] : recommendations,
    exploration: !hidden && !ranked.length ? hostProfiles.filter(profile => ['clear', 'warm', 'humor'].includes(profile.id)) : [],
    evidence: hidden ? [] : evidence,
    avoidance: hidden ? null : avoidance[answers[10]],
  };
}

function buildScenes(answers, result) {
  if (result.hidden) return [{ title: '从你真正需要的消息开始', text: '校园通知、同学推荐，或刚好感兴趣的话题，不必为了参与而增加观看时间。' }];
  const contexts = [
    { title: '校园广播', text: '试试听重点清楚、衔接自然的栏目，适合在校园日常里顺手获取消息。' },
    { title: '校园活动与晚会', text: '现场互动、流程衔接和临场表达，是你可以继续观察的内容。' },
    { title: '社团招新', text: '先看活动做什么、适合谁，再决定是否继续了解，比只看热闹更有帮助。' },
    { title: '校园社群', text: '时间、地点和参与方式一眼可见的资讯，更方便你决定下一步。' },
    { title: '课堂与讲座', text: '结构清楚的知识分享和带实例的访谈，值得按兴趣慢慢挑。' },
    { title: '同学推荐', text: '从同学转来的内容里，留意你们共同在意的话题，也可以交换各自的看法。' },
    { title: '按兴趣探索', text: '你平时接触校园资讯不多，可以先从一场感兴趣的活动或一个需要解决的问题开始。' },
  ];
  const time = [
    { title: '起床后的轻量浏览', text: '先看看最关心的一条消息，给新一天留一点余地。' },
    { title: '用餐时的观看搭子', text: '轻松但重点清楚的聊天或短内容，适合陪你吃完一顿饭。' },
    { title: '课间的小小切换', text: '适合随时停下、重点先到的短内容，别让一条接一条挤占休息时间。' },
    { title: '等候时的短暂浏览', text: '可以暂停、随时结束的内容更方便，也给周围的路况和提醒留一点注意。' },
    { title: '零碎时间里的速览', text: '看一条真正需要的信息就好，不必为了填满每个空隙而继续刷。' },
    { title: '睡前的放松时刻', text: '舒缓的聊天或故事可能更合拍，也可以提前给自己留一个结束点。' },
    { title: '给深夜留一个结束点', text: '你提到了熬夜时停不下来。试着把感兴趣的内容先收藏，留到明天再看。' },
    { title: '跟着内容与心情走', text: '你的观看时间很随机，可以按当下想了解什么、需要什么来挑内容。' },
  ];
  return [contexts[answers[7]], time[answers[2]]];
}

function buildInsights(answers) {
  if (!Array.isArray(answers) || answers.length !== questions.length || !answers.every((value, index) => Number.isInteger(value) && value >= 0 && value < questions[index][1].length)) throw new RangeError('Complete answers required');
  const result = calculate(answers);
  const dimensions = dimensionDefinitions.map((definition, dimensionIndex) => {
    const evidence = answers.flatMap((answer, index) => {
      const contribution = score[index][answer][dimensionIndex];
      return contribution ? [{ ...answerEvidence(answers, index), direction: contribution > 0 ? definition.leftShort : definition.rightShort }] : [];
    });
    const status = result.hidden ? 'limited' : !result.total[dimensionIndex] ? 'unknown' : result.pct[dimensionIndex] === 50 ? 'balanced' : 'leaning';
    const leftPercent = ['limited', 'unknown'].includes(status) ? null : result.pct[dimensionIndex];
    const label = status === 'limited' ? '暂不判断' : status === 'unknown' ? '偏好还不明显' : status === 'balanced' ? '两边都合拍' : `更偏向${leftPercent > 50 ? definition.leftShort : definition.rightShort}`;
    const description = status === 'limited' ? '相关内容在你最近的生活里存在感较轻，先不根据少量接触替你定下偏好。' : status === 'unknown' ? '这次回答还没有提供足够的相关线索，可以保留开放的可能，不必急着归类。' : status === 'balanced' ? definition.balanced : definition.descriptions[leftPercent > 50 ? 0 : 1];
    return { ...definition, id: dimensionIndex, status, leftPercent, label, description, evidence: status === 'limited' ? [] : evidence, note: dimensionIndex === 3 ? '这一维主要参考你看完内容后的行为，线索较少，适合轻松参考。' : `参考了 ${evidence.length} 道相关回答。` };
  });
  const summary = result.hidden ? '你不需要参加每一场屏幕狂欢。最近相关内容在你的生活里存在感较轻，保持自己的观看节奏就好。' : dimensions.filter(dimension => dimension.status === 'leaning').map(dimension => dimension.description).join('') || '这次回答没有显现明显的单侧偏好。你可以根据内容、心情和场景选择自己的观看方式。';
  const interaction = answers[11];
  const buddy = result.hidden ? '找一个消息灵通、又不会催你参与的同学；需要时交换重点，平时各有自己的节奏。' : interaction === 1 ? '适合找愿意交换内容的同学：你转来一条新消息，TA分享一个新角度，一起把话题聊下去。' : interaction === 3 ? '适合找愿意认真聊两句的朋友：可以有不同看法，也能让每个人把话说完。' : interaction === 0 || interaction === 2 ? '适合找兴趣相近的同学：交换收藏和账号推荐，不用每次都热聊，也能一起发现好内容。' : '适合找相处轻松的观看搭子：想聊时接得上，安静看一会儿也不尴尬。';
  const tagPairs = [['碎片冲浪', '沉浸观看'], ['信息捕手', '共鸣充电'], ['自然稳场', '有梗有态度'], ['安静在线', '互动探索']];
  const supportedTags = [0, 1, 3, 2].flatMap(index => dimensions[index].status === 'leaning' ? [tagPairs[index][dimensions[index].leftPercent > 50 ? 0 : 1]] : []).slice(0, 3);
  const tags = result.hidden ? ['自带节奏', '偶尔上线', '自在观察'] : supportedTags.length ? supportedTags : ['偏好开放', '慢慢探索'];
  return { result, dimensions, host: buildHost(answers, result.hidden), scenes: buildScenes(answers, result), summary, buddy, tags };
}

export { buildInsights };
