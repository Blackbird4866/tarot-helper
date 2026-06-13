export const spreads = [
  {
    id: "advanced-basic",
    name: "基础牌阵（进阶）",
    subtitle: "大牌定走向，小牌补细节",
    description: "在基础五张牌上，每个位置各加一张小牌。小牌用于补充细节，不推翻大牌。",
    source: "塔罗二阶（四）进阶牌阵.pptx / slide 2",
    slots: [
      { id: "result-major", number: 1, title: "结果", prompt: "大阿卡纳：结果的主线走向", preferredArcana: "major", x: 43, y: 34, w: 10, h: 29 },
      { id: "cause-major", number: 2, title: "原因", prompt: "大阿卡纳：事件形成的根本原因", preferredArcana: "major", x: 28, y: 8, w: 10, h: 29 },
      { id: "environment-major", number: 3, title: "外在环境", prompt: "大阿卡纳：外部条件与处境", preferredArcana: "major", x: 69, y: 8, w: 10, h: 29 },
      { id: "risk-major", number: 4, title: "潜在隐藏危机", prompt: "大阿卡纳：潜伏的问题或盲点", preferredArcana: "major", x: 28, y: 62, w: 10, h: 29 },
      { id: "inner-major", number: 5, title: "内心想法", prompt: "大阿卡纳：内在动机与真实想法", preferredArcana: "major", x: 69, y: 62, w: 10, h: 29 },
      { id: "result-minor", number: 6, title: "结果补充", prompt: "小阿卡纳：结果层面的细节补充", preferredArcana: "minor", x: 56, y: 34, w: 10, h: 29 },
      { id: "cause-minor", number: 7, title: "原因补充", prompt: "小阿卡纳：原因层面的具体表现", preferredArcana: "minor", x: 15, y: 8, w: 10, h: 29 },
      { id: "environment-minor", number: 8, title: "外在环境补充", prompt: "小阿卡纳：外部环境的细节", preferredArcana: "minor", x: 82, y: 8, w: 10, h: 29 },
      { id: "risk-hidden", number: 9, title: "隐藏危机补充", prompt: "小阿卡纳：危机触发点或现实细节", preferredArcana: "minor", x: 15, y: 62, w: 10, h: 29 },
      { id: "inner-minor", number: 10, title: "内心想法补充", prompt: "小阿卡纳：内心状态的细节", preferredArcana: "minor", x: 82, y: 62, w: 10, h: 29 }
    ]
  },
  {
    id: "choice",
    name: "选择牌阵",
    subtitle: "A/B/C 三个选择，各三张大牌",
    description: "用于比较明确、可比的选项。时间脉络由近及远，项目建议不超过四个。",
    source: "塔罗二阶（四）进阶牌阵.pptx / slide 3",
    slots: [
      { id: "a1", number: 1, title: "A1", prompt: "选项 A 的近期状态", preferredArcana: "major", x: 18, y: 7, w: 10, h: 29 },
      { id: "b1", number: 2, title: "B1", prompt: "选项 B 的近期状态", preferredArcana: "major", x: 44.5, y: 7, w: 10, h: 29 },
      { id: "c1", number: 3, title: "C1", prompt: "选项 C 的近期状态", preferredArcana: "major", x: 71, y: 7, w: 10, h: 29 },
      { id: "a2", number: 4, title: "A2", prompt: "选项 A 的中段发展", preferredArcana: "major", x: 18, y: 36, w: 10, h: 29 },
      { id: "b2", number: 5, title: "B2", prompt: "选项 B 的中段发展", preferredArcana: "major", x: 44.5, y: 36, w: 10, h: 29 },
      { id: "c2", number: 6, title: "C2", prompt: "选项 C 的中段发展", preferredArcana: "major", x: 71, y: 36, w: 10, h: 29 },
      { id: "a3", number: 7, title: "A3", prompt: "选项 A 的远期结果", preferredArcana: "major", x: 18, y: 65, w: 10, h: 29 },
      { id: "b3", number: 8, title: "B3", prompt: "选项 B 的远期结果", preferredArcana: "major", x: 44.5, y: 65, w: 10, h: 29 },
      { id: "c3", number: 9, title: "C3", prompt: "选项 C 的远期结果", preferredArcana: "major", x: 71, y: 65, w: 10, h: 29 }
    ]
  },
  {
    id: "time-12",
    name: "时间牌阵：12 月 + 整体",
    subtitle: "十二个月趋势与整体基调",
    description: "按时间跨度依次放置牌面，整体牌视为基调并给出建议。",
    source: "塔罗二阶（四）进阶牌阵.pptx / slide 4",
    slots: [
      ...Array.from({ length: 12 }, (_, index) => ({
        id: `month-${index + 1}`,
        number: index + 1,
        title: `${index + 1}月`,
        prompt: `第 ${index + 1} 个时间单位的状况描述`,
        x: 5 + (index % 6) * 14,
        y: index < 6 ? 9 : 61,
        w: 10,
        h: 29
      })),
      { id: "overall", number: 13, title: "整体", prompt: "整个周期的基调与建议", x: 87, y: 35, w: 10, h: 29 }
    ]
  },
  {
    id: "time-7",
    name: "时间牌阵：七日",
    subtitle: "一周七个时间点",
    description: "适合短周期观察，根据正逆位先做第一判断，再结合牌意描述状况。",
    source: "塔罗二阶（四）进阶牌阵.pptx / slide 4",
    slots: Array.from({ length: 7 }, (_, index) => ({
      id: `day-${index + 1}`,
      number: index + 1,
      title: `第 ${index + 1} 日`,
      prompt: `第 ${index + 1} 个时间点的状态与提醒`,
      x: 4 + index * 13.6,
      y: 32,
      w: 10,
      h: 29
    }))
  },
  {
    id: "lover-pyramid",
    name: "恋人金字塔",
    subtitle: "三个月左右的关系观察",
    description: "用于关系议题，重点注意牌在阵内的位置与彼此关系。",
    source: "塔罗二阶（四）进阶牌阵.pptx / slide 5",
    slots: [
      { id: "self-view", number: 1, title: "你对这段感情的看法", prompt: "自己的主观态度、期待与投射", x: 44.5, y: 54, w: 10, h: 29 },
      { id: "other-view", number: 2, title: "另一半对这段感情的看法", prompt: "对方的态度、感受与顾虑", x: 24, y: 54, w: 10, h: 29 },
      { id: "current-relationship", number: 3, title: "现在的关系", prompt: "当前关系状态与互动模式", x: 65, y: 54, w: 10, h: 29 },
      { id: "future-love", number: 4, title: "未来感情发展", prompt: "三个月内可能的发展趋势", x: 44.5, y: 15, w: 10, h: 29 }
    ]
  },
  {
    id: "overall-fortune",
    name: "整体运势牌阵",
    subtitle: "年运、半年运、季节运",
    description: "1 号位与 7 号位相呼应；6 号位是客人的状况，需要做正向引导。",
    source: "塔罗二阶（四）进阶牌阵.pptx / slide 6",
    slots: [
      { id: "focus", number: 1, title: "目前关注的生活重点", prompt: "当下最需要被看见的主轴", x: 44.5, y: 5, w: 10, h: 29 },
      { id: "family", number: 2, title: "家庭状况", prompt: "家庭、居住、亲密支持系统", x: 26, y: 34, w: 10, h: 29 },
      { id: "body", number: 3, title: "身体状况", prompt: "健康、精力与身体讯号", x: 63, y: 34, w: 10, h: 29 },
      { id: "work", number: 4, title: "工作运势状况", prompt: "事业、学业、项目与产出", x: 8, y: 63, w: 10, h: 29 },
      { id: "relationships", number: 5, title: "人际互动关系状况", prompt: "社交、合作、关系边界", x: 81, y: 63, w: 10, h: 29 },
      { id: "emotion", number: 6, title: "自我情绪状况", prompt: "情绪基调与内在调适方向", x: 35.5, y: 63, w: 10, h: 29 },
      { id: "lesson", number: 7, title: "得到和所需注意事项", prompt: "收获、提醒与行动建议", x: 53.5, y: 63, w: 10, h: 29 }
    ]
  }
];
