// One original collectible figure per result, including the hidden ZEN result.
export const personaArt = Object.freeze({
  SIWQ: ['静音情报员', '戴耳机、拿校园地图的深蓝浣熊情报员'],
  SIWV: ['校园情报站', '拿话筒和校园传单的珊瑚橙狐狸记者'],
  SIMQ: ['冷面梗侦探', '用放大镜研究小黄鸭的灰猫侦探'],
  SIMV: ['热梗速递员', '戴头盔、抱闪电包裹的青蛙快递员'],
  SEWQ: ['下饭陪伴家', '抱饭碗和小抱枕的奶油仓鼠'],
  SEWV: ['课间暖场王', '穿棒球夹克、摇铃鼓的金黄小狮子'],
  SEMQ: ['快乐潜水员', '戴潜水面镜、抱贝壳的薄荷小海豹'],
  SEMV: ['气氛发动机', '穿亮色舞台服、举迪斯科球的粉红小龙'],
  DIWQ: ['深潜研究员', '戴圆眼镜、抱研究手册的蓝色猫头鹰'],
  DIWV: ['知识传送门', '披星空斗篷、展开知识卷轴的白色独角兽'],
  DIMQ: ['犀利观察家', '戴单片镜、抱观察笔记的墨绿渡鸦'],
  DIMV: ['观点扩音器', '拿扩音喇叭、穿飞行夹克的红色公羊'],
  DEWQ: ['深夜树洞客', '穿月亮睡袍、抱星星灯的紫色小考拉'],
  DEWV: ['共鸣连接者', '牵着爱心电话线的蜜桃色垂耳兔'],
  DEMQ: ['故事收藏家', '背故事匣、拿迷你书的焦糖小熊'],
  DEMV: ['话题策展人', '戴艺术家贝雷帽、举灵感板的孔雀'],
  ZEN: ['佛系观察员', '闭眼坐在莲叶垫上、端茶的鼠尾草绿水豚'],
});

export function portraitFor(result) {
  const code = Object.hasOwn(personaArt, result.code) ? result.code : 'ZEN';
  const [name, description] = personaArt[code];
  return { src: `assets/personas/${code.toLowerCase()}.webp`, alt: `${name}：${description}潮玩形象` };
}
