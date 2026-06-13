const cardImageBaseUrl = "https://raw.githubusercontent.com/metabismuth/tarot-json/master/cards";

const major = [
  ["major-fool", "愚人", ["自由", "开始", "冒险"], ["鲁莽", "逃避", "漂流"], "愚人象征纯粹经验的开始，也提示跳出规则时要分辨自由与失控。"],
  ["major-magician", "魔术师", ["意志", "技巧", "创造"], ["操控", "虚张声势", "分散"], "魔术师把想法落到现实，强调资源整合、表达能力与主动创造。"],
  ["major-high-priestess", "女祭司", ["直觉", "秘密", "静默"], ["迟疑", "隐瞒", "断联直觉"], "女祭司守护隐秘智慧，提醒先观察、聆听潜意识，而不是急着表态。"],
  ["major-empress", "女皇", ["滋养", "丰盛", "关系"], ["过度依赖", "停滞", "耗竭"], "女皇代表生长、照料与创造力，常指向关系中的温柔支持和物质丰饶。"],
  ["major-emperor", "皇帝", ["秩序", "边界", "领导"], ["控制", "僵化", "权威冲突"], "皇帝强调结构、规则与责任，也提醒不要把安全感变成压制。"],
  ["major-hierophant", "教皇", ["传统", "教导", "信念"], ["教条", "反叛", "价值冲突"], "教皇连接个人与系统，代表学习、传承、制度和价值观的确认。"],
  ["major-lovers", "恋人", ["选择", "结合", "价值一致"], ["摇摆", "诱惑", "不一致"], "恋人不仅是爱情，也是在欲望、承诺和人生道路之间做出选择。"],
  ["major-chariot", "战车", ["胜利", "推进", "自控"], ["失控", "急躁", "方向冲突"], "战车象征意志驱动的前进，需要同时驾驭冲动与理性。"],
  ["major-strength", "力量", ["勇气", "温柔", "内在韧性"], ["压抑", "失去耐心", "自我怀疑"], "力量不是硬碰硬，而是用稳定、信任和耐心安抚内在本能。"],
  ["major-hermit", "隐士", ["沉思", "指引", "独处"], ["孤立", "封闭", "迷失"], "隐士代表向内寻找答案，也可能是经验者为后来者举灯。"],
  ["major-wheel", "命运之轮", ["转机", "循环", "时运"], ["失序", "重复课题", "抗拒变化"], "命运之轮提示局势正在变化，顺势而为比强行控制更重要。"],
  ["major-justice", "正义", ["平衡", "因果", "判断"], ["偏差", "不公", "逃避责任"], "正义要求看见事实、承担选择后果，并把关系重新放回平衡。"],
  ["major-hanged-man", "吊人", ["暂停", "换位", "牺牲"], ["卡住", "拖延", "无谓消耗"], "吊人提示暂时悬置行动，用不同视角理解困境。"],
  ["major-death", "死神", ["结束", "转化", "更新"], ["抗拒结束", "停滞", "旧模式"], "死神代表一个阶段的终结，为新状态腾出空间。"],
  ["major-temperance", "节制", ["调和", "疗愈", "适度"], ["失衡", "过量", "配合不良"], "节制强调整合对立面，以温和节奏完成修复与调配。"],
  ["major-devil", "恶魔", ["欲望", "束缚", "成瘾"], ["松绑", "觉察", "挣脱诱惑"], "恶魔揭示被欲望、恐惧或物质执念绑住的部分。"],
  ["major-tower", "高塔", ["崩塌", "觉醒", "重建"], ["余震", "否认", "害怕改变"], "高塔是突然破局，拆掉不稳固的结构，让真实浮现。"],
  ["major-star", "星星", ["希望", "疗愈", "灵感"], ["失望", "信念低落", "疏离"], "星星带来长线希望、温柔修复和对未来的信任。"],
  ["major-moon", "月亮", ["潜意识", "迷雾", "敏感"], ["看清", "焦虑", "幻想破除"], "月亮指向未知、梦境与情绪波动，需要辨别直觉和恐惧。"],
  ["major-sun", "太阳", ["成功", "清晰", "生命力"], ["延迟", "过度乐观", "能量不足"], "太阳代表清楚、温暖和显化，让事情回到可见的喜悦。"],
  ["major-judgement", "审判", ["召唤", "复苏", "决定"], ["逃避召唤", "自责", "迟迟不决"], "审判象征觉醒与重新回应生命召唤，适合做阶段性总结。"],
  ["major-world", "世界", ["完成", "整合", "圆满"], ["未完成", "收尾困难", "局限"], "世界代表一个周期完成，也提示把经验整合成新的格局。"]
];

const suits = {
  wands: {
    label: "权杖",
    theme: "行动、热情、创造力与事业推进",
    upright: ["行动力", "热情", "突破"],
    reversed: ["急躁", "动力不足", "方向散乱"]
  },
  cups: {
    label: "圣杯",
    theme: "情绪、关系、感受与滋养",
    upright: ["情感流动", "共情", "滋养"],
    reversed: ["情绪堵塞", "依赖", "失望"]
  },
  swords: {
    label: "宝剑",
    theme: "思考、沟通、冲突与判断",
    upright: ["理性", "沟通", "决断"],
    reversed: ["过度思虑", "误解", "逃避真相"]
  },
  pentacles: {
    label: "金币",
    theme: "现实资源、金钱、身体与长期建设",
    upright: ["稳定", "资源", "实践"],
    reversed: ["停滞", "匮乏感", "现实压力"]
  }
};

const ranks = [
  ["ace", "王牌", "新机会与种子", "机会尚未落地"],
  ["two", "二", "选择、平衡与互动", "摇摆、迟疑或失衡"],
  ["three", "三", "成长、协作与初步成果", "合作卡顿或成果不稳"],
  ["four", "四", "稳定、结构与停顿", "僵化、封闭或安全感不足"],
  ["five", "五", "挑战、冲突与调整", "损耗后复盘或不愿面对冲突"],
  ["six", "六", "修复、流动与阶段性改善", "旧事牵绊或改善受阻"],
  ["seven", "七", "评估、坚持与考验", "怀疑、分散或耐心不足"],
  ["eight", "八", "推进、练习与效率", "重复消耗或节奏失控"],
  ["nine", "九", "积累、接近完成与个人状态", "过度防备或满足感不足"],
  ["ten", "十", "完成、承担与周期结果", "负担过重或收尾困难"],
  ["page", "侍从", "学习、消息与初阶尝试", "不成熟、信息延误或经验不足"],
  ["knight", "骑士", "推进、追求与行动方式", "冒进、摇摆或动力失衡"],
  ["queen", "王后", "成熟感受、承接与内在掌控", "过度承担、敏感或边界松动"],
  ["king", "国王", "成熟管理、决策与外在掌控", "控制欲、固执或责任失衡"]
];

export const tarotCards = [
  ...major.map(([id, name, uprightKeywords, reversedKeywords, detail], index) => ({
    id,
    name,
    arcana: "major",
    uprightKeywords,
    reversedKeywords,
    detail,
    source: "维特塔罗学习.docx + 通用维特牌义整理",
    imageUrl: `${cardImageBaseUrl}/m${String(index).padStart(2, "0")}.jpg`
  })),
  ...Object.entries(suits).flatMap(([suit, suitMeta]) =>
    ranks.map(([rank, rankLabel, uprightMeaning, reversedMeaning], index) => ({
      id: `minor-${suit}-${rank}`,
      name: `${suitMeta.label}${rankLabel}`,
      arcana: "minor",
      suit,
      rank,
      uprightKeywords: [...suitMeta.upright, uprightMeaning],
      reversedKeywords: [...suitMeta.reversed, reversedMeaning],
      detail: `${suitMeta.label}围绕${suitMeta.theme}。${rankLabel}强调${uprightMeaning}；逆位时常表现为${reversedMeaning}，需要结合牌位判断它是在提醒风险、指出阻滞，还是要求调整节奏。`,
      source: "通用维特牌义整理，待课程 PDF 覆盖",
      imageUrl: `${cardImageBaseUrl}/${suit[0]}${String(index + 1).padStart(2, "0")}.jpg`
    }))
  )
];

export const arcanaLabels = {
  major: "大阿卡纳",
  minor: "小阿卡纳"
};

export const suitLabels = Object.fromEntries(Object.entries(suits).map(([key, value]) => [key, value.label]));
export const rankLabels = Object.fromEntries(ranks.map(([key, label]) => [key, label]));
