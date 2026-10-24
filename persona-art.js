// One unified pig identity, 17 personality outfits, including the hidden ZEN result.
export const personaArt = Object.freeze({
  SIWQ: ['静音情报员', '穿深蓝卫衣、戴耳机、拿地图的小猪'],
  SIWV: ['校园情报站', '穿薄荷棒球夹克、戴报童帽、拿话筒的小猪'],
  SIMQ: ['冷面梗侦探', '穿淡紫风衣、戴贝雷帽、拿放大镜的小猪'],
  SIMV: ['热梗速递员', '穿橙色快递马甲、戴头盔、抱闪电包裹的小猪'],
  SEWQ: ['下饭陪伴家', '穿鼠尾草绿开衫和格纹围裙、抱饭碗的小猪'],
  SEWV: ['课间暖场王', '穿金黄棒球夹克、反戴帽子、摇铃鼓的小猪'],
  SEMQ: ['快乐潜水员', '穿薄荷潜水服、戴潜水镜、抱贝壳的小猪'],
  SEMV: ['气氛发动机', '穿粉银派对外套、举迪斯科球的小猪'],
  DIWQ: ['深潜研究员', '穿蓝色实验服、戴圆眼镜、抱研究手册的小猪'],
  DIWV: ['知识传送门', '穿紫色星星学者斗篷、展开知识卷轴的小猪'],
  DIMQ: ['犀利观察家', '穿墨绿长外套、戴单片镜、拿观察笔记的小猪'],
  DIMV: ['观点扩音器', '穿砖红飞行夹克、拿扩音喇叭的小猪'],
  DEWQ: ['深夜树洞客', '穿月亮睡袍和睡帽、抱星星灯的小猪'],
  DEWV: ['共鸣连接者', '穿蜜桃牛角扣外套、围围巾、拿爱心电话的小猪'],
  DEMQ: ['故事收藏家', '穿焦糖背带裤、背故事匣、拿迷你书的小猪'],
  DEMV: ['话题策展人', '穿画家罩衫、戴紫色贝雷帽、举灵感板的小猪'],
  ZEN: ['佛系观察员', '穿燕麦色宽松袍、闭眼坐在莲叶垫上端茶的小猪'],
});

export function portraitFor(result) {
  const code = Object.hasOwn(personaArt, result.code) ? result.code : 'ZEN';
  const [name, description] = personaArt[code];
  return { src: `assets/pigs/${code.toLowerCase()}.webp`, thumbSrc: `assets/pigs/${code.toLowerCase()}-small.webp`, alt: `${name}：${description}潮玩形象` };
}
