const questions = [
  [
    "你的性别",
    [
      "女",
      "男"
    ],
    {
      "type": "single",
      "maxChoices": 1,
      "letters": [
        "A",
        "B"
      ]
    }
  ],
  [
    "你的年级",
    [
      "本科",
      "硕士研究生",
      "博士研究生",
      "其他"
    ],
    {
      "type": "single",
      "maxChoices": 1,
      "letters": [
        "A",
        "B",
        "C",
        "D"
      ]
    }
  ],
  [
    "你的专业类别",
    [
      "人文科学（Humanities）：研究人本身、文化、精神，哲学、文学、历史、艺术",
      "社会科学（Social Sciences）：研究人类社会运行，经济学、法学、教育学、传播学、管理学",
      "自然科学（Natural Sciences）及应用科学：研究客观自然界，理学，工学、农学、医学",
      "其他"
    ],
    {
      "type": "single",
      "maxChoices": 1,
      "letters": [
        "A",
        "B",
        "C",
        "D"
      ]
    }
  ],
  [
    "你会不会刷播音、口播、校园融媒体这类内容？",
    [
      "几乎每天刷",
      "每周3-5次",
      "每周1-2次",
      "偶尔看看",
      "基本不看（直接跳到末尾提交）"
    ],
    {
      "type": "single",
      "maxChoices": 1,
      "letters": [
        "A",
        "B",
        "C",
        "D",
        "E"
      ]
    }
  ],
  [
    "你刷这类内容最常用的平台是？",
    [
      "官方媒体（央视/电视台节目等）",
      "短视频平台（抖音/小红书等）",
      "网络互动平台（知乎/微博等）",
      "校园官方融媒体账号",
      "其他"
    ],
    {
      "type": "single",
      "maxChoices": 1,
      "letters": [
        "A",
        "B",
        "C",
        "D",
        "E"
      ]
    }
  ],
  [
    "你一般在什么时间段接触口播/播音类内容？",
    [
      "早间（上下课路上）",
      "午间（吃饭、午休前后）",
      "晚间休闲时段",
      "睡前",
      "没有固定时间，刷到就看"
    ],
    {
      "type": "multiple",
      "maxChoices": 5,
      "letters": [
        "A",
        "B",
        "C",
        "D",
        "F"
      ]
    }
  ],
  [
    "你可以接受的单条短视频口播最优时长是？",
    [
      "60秒以内",
      "1–5分钟",
      "5-10分钟",
      "10-30分钟",
      "30分钟以上"
    ],
    {
      "type": "single",
      "maxChoices": 1,
      "letters": [
        "A",
        "B",
        "C",
        "D",
        "E"
      ]
    }
  ],
  [
    "你最常观看/收听的口播、播音类内容类型是？",
    [
      "生活娱乐类：搞笑日常、潮流分享",
      "知识学习类：科普干货、专业内容讲解、AI/科技/新传、虚拟主播内容",
      "情感成长类：治愈故事、成长感悟、人生分享",
      "社会资讯类：新闻资讯、时事评论",
      "文化艺文类：音乐、朗读、文学赏析",
      "校园专属类：校园通知、校园活动宣传",
      "其他"
    ],
    {
      "type": "multiple",
      "maxChoices": 7,
      "letters": [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G"
      ]
    }
  ],
  [
    "抓住你的眼球，让你愿意继续看下去的首要原因？【不超过三项】",
    [
      "主播的声音、普通话与表达功底",
      "内容干货足，观点有价值",
      "共情力强，容易产生共鸣",
      "画面剪辑好看",
      "内容轻松解压好玩",
      "内容真实可信"
    ],
    {
      "type": "multiple",
      "maxChoices": 3,
      "letters": [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F"
      ]
    }
  ],
  [
    "下面哪一类口播视频，是你最不想点开观看的？",
    [
      "过度营销类：硬广堆砌、强行带货的口播",
      "情绪对立类：刻意引战、煽动矛盾的争议口播",
      "内容质量差类：空洞无物的流水账，或是片面不实的伪科普、谣言口播",
      "低俗博眼球类：靠低俗玩梗博取流量的娱乐吐槽口播",
      "其他"
    ],
    {
      "type": "single",
      "maxChoices": 1,
      "letters": [
        "A",
        "B",
        "C",
        "D",
        "E"
      ]
    }
  ],
  [
    "这类口播/播音内容，会传递审美、观念，拓宽我的认知。（打分规则：1=完全不同意，5=完全同意）",
    [
      "1",
      "2",
      "3",
      "4",
      "5"
    ],
    {
      "type": "rating",
      "maxChoices": 1,
      "letters": [
        "",
        "",
        "",
        "",
        ""
      ]
    }
  ],
  [
    "你刷到的很多口播内容藏着广告、带货等商业推广目的。",
    [
      "1",
      "2",
      "3",
      "4",
      "5"
    ],
    {
      "type": "rating",
      "maxChoices": 1,
      "letters": [
        "",
        "",
        "",
        "",
        ""
      ]
    }
  ],
  [
    "看完一段口播视频，你通常会？",
    [
      "默默看完，不留任何互动",
      "偶尔点赞收藏，很少留言",
      "经常评论发表想法",
      "转发分享给朋友"
    ],
    {
      "type": "single",
      "maxChoices": 1,
      "letters": [
        "A",
        "B",
        "C",
        "D"
      ]
    }
  ],
  [
    "你刷这类内容最主要的目的是？",
    [
      "涨知识、了解社会热点",
      "解压放松，获得情绪陪伴",
      "学习表达、提升审美",
      "紧跟热点，方便和同学聊天",
      "单纯打发空闲时间"
    ],
    {
      "type": "single",
      "maxChoices": 1,
      "letters": [
        "A",
        "B",
        "C",
        "D",
        "E"
      ]
    }
  ],
  [
    "相同主题下，你更愿意相信哪类账号的口播内容？",
    [
      "电视台/广播等官方媒体",
      "校园官方融媒体",
      "自媒体博主",
      "商业营销账号"
    ],
    {
      "type": "single",
      "maxChoices": 1,
      "letters": [
        "A",
        "B",
        "C",
        "D"
      ]
    }
  ],
  [
    "除上面选择的首选平台之外，你还会从哪些渠道看这类内容？",
    [
      "央视/卫视等官方媒体",
      "抖音/快手",
      "小红书/视频号",
      "B站",
      "校园官方融媒体账号",
      "其他"
    ],
    {
      "type": "multiple",
      "maxChoices": 6,
      "letters": [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F"
      ]
    }
  ]
];

const names = ['静音情报员','校园情报站','冷面梗侦探','热梗速递员','下饭陪伴家','课间暖场王','快乐潜水员','气氛发动机','深潜研究员','知识传送门','犀利观察家','观点扩音器','深夜树洞客','共鸣连接者','故事收藏家','话题策展人'];

// Entertainment-only interpretation, not a scoring system supplied by the questionnaire.
// Gender, degree, major, viewing frequency, platforms, trust and agreement ratings do not score personality.
const zero = count => Array.from({ length: count }, () => [0, 0, 0, 0]);
const score = [
  zero(2), zero(4), zero(4), zero(5), zero(5),
  [[1,0,0,0],[0,0,0,0],[-1,0,0,0],[-1,0,0,0],[0,0,0,0]],
  [[3,0,0,0],[1,0,0,0],[-1,0,0,0],[-2,0,0,0],[-3,0,0,0]],
  [[0,-2,0,0],[0,2,0,0],[0,-2,0,0],[0,2,0,0],[0,0,0,0],[0,1,0,0],[0,0,0,0]],
  [[0,0,2,0],[0,2,1,0],[0,-2,-2,0],[0,0,0,0],[0,-2,-2,0],[0,0,2,0]],
  zero(5), zero(5), zero(5),
  [[0,0,0,3],[0,0,0,1],[0,0,0,-3],[0,0,0,-3]],
  [[0,3,0,0],[0,-3,0,0],[0,2,0,0],[0,1,0,0],[0,0,0,0]],
  zero(4), zero(6),
];
function isAnswered(answer, index) {
  const [, options, meta] = questions[index];
  const valid = value => Number.isInteger(value) && value >= 0 && value < options.length;
  return meta.type === 'multiple'
    ? Array.isArray(answer) && answer.length > 0 && answer.length <= meta.maxChoices && new Set(answer).size === answer.length && answer.every(valid)
    : valid(answer);
}
function activeCount(answers) { return answers[3] === 4 ? 4 : questions.length; }
function isComplete(answers) {
  return Array.isArray(answers) && answers.length === questions.length && answers.slice(0, activeCount(answers)).every((answer, index) => isAnswered(answer, index));
}
function selectedOptions(answers, index) {
  if (!isAnswered(answers[index], index)) return [];
  return Array.isArray(answers[index]) ? answers[index] : [answers[index]];
}
function answerLabel(answers, index) { return selectedOptions(answers, index).map(option => questions[index][1][option]).join('；'); }
function contribution(answers, index, dimension) {
  const selected = selectedOptions(answers, index);
  if (!selected.length) return { sum: 0, total: 0 };
  // Average within each multiple-choice question so extra selections do not increase its weight.
  return {
    sum: selected.reduce((n, option) => n + score[index][option][dimension], 0) / selected.length,
    total: selected.reduce((n, option) => n + Math.abs(score[index][option][dimension]), 0) / selected.length,
  };
}
function calculate(answers) {
  if (!isComplete(answers)) throw new RangeError('Complete answers required');
  const hidden = activeCount(answers) === 4;
  const sum = [0,0,0,0], total = [0,0,0,0];
  if (!hidden) answers.forEach((_, index) => sum.forEach((__, dimension) => {
    const value = contribution(answers, index, dimension);
    sum[dimension] += value.sum; total[dimension] += value.total;
  }));
  const bits = sum.map(n => n < 0 ? 1 : 0);
  return {
    code: hidden ? 'ZEN' : bits.map((bit, index) => ['SD','IE','WM','QV'][index][bit]).join(''),
    name: hidden ? '佛系观察员' : names[bits.reduce((value, bit) => value * 2 + bit, 0)],
    bits, pct: sum.map((n, i) => total[i] ? Math.round(50 + 50 * n / total[i]) : 50), total, hidden,
  };
}
function info(result) { return { tags: result.hidden ? ['自带节奏','轻量接触'] : ['校园观察','自在冲浪'] }; }

export { questions, names, score, calculate, info, isAnswered, activeCount, isComplete, selectedOptions, answerLabel, contribution };
