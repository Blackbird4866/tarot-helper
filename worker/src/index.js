const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...(init.headers ?? {})
    }
  });
}

function cardOrientationLabel(orientation) {
  return orientation === "reversed" ? "逆位" : "正位";
}

function compactKeywords(keywords = [], limit = 4) {
  return [...new Set(keywords.filter(Boolean).map(String))].slice(0, limit);
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function fallbackPositionInsight(position) {
  const card = position.card;
  const keywords = compactKeywords(card?.keywords ?? [], 4);
  const orientation = cardOrientationLabel(position.orientation);
  const keywordText = keywords.length ? `关键词是${keywords.join("、")}` : "需要结合牌位观察";
  return {
    slotId: position.slotId,
    title: position.title,
    cardName: card?.name ?? "",
    summary: `${card?.name ?? "这张牌"}${orientation}落在「${position.title}」，${keywordText}。结合这个位置，它提示你关注「${position.prompt}」里的具体状态和可调整之处。`,
    keywords,
    evidence: "这是基于牌名、正逆位关键词与当前牌位含义的保底提示，建议生成 AI 解读后再展开联想。",
    reflection: "这张牌让你最先想到现实中的哪个具体人、场景或选择？"
  };
}

function fallbackReading(payload) {
  const allKeywords = compactKeywords(payload.positions.flatMap((position) => position.card?.keywords ?? []), 6);
  const mainCards = payload.positions
    .slice(0, 3)
    .map((position) => `${position.title}为${position.card?.name ?? "未命名牌"}${cardOrientationLabel(position.orientation)}`)
    .join("，");
  return {
    summary: `${payload.spread.name}显示：${mainCards}。整体重点在于把牌位提示拆回现实行动，不把结果视为定论。`,
    keywords: allKeywords.length ? allKeywords : ["观察", "调整", "行动"],
    positionInsights: payload.positions.map(fallbackPositionInsight)
  };
}

function completeReading(parsed, payload) {
  const fallback = fallbackReading(payload);
  const existingInsights = new Map(
    (Array.isArray(parsed?.positionInsights) ? parsed.positionInsights : [])
      .filter((item) => item?.slotId)
      .map((item) => [
        String(item.slotId),
        {
          slotId: String(item.slotId),
          title: cleanText(item.title),
          cardName: cleanText(item.cardName),
          summary: cleanText(item.summary),
          keywords: compactKeywords(item.keywords ?? [], 5),
          evidence: cleanText(item.evidence),
          reflection: cleanText(item.reflection)
        }
      ])
  );

  return {
    summary: cleanText(parsed?.summary) || fallback.summary,
    keywords: compactKeywords(parsed?.keywords ?? fallback.keywords, 6),
    positionInsights: payload.positions.map((position) => {
      const fallbackInsight = fallbackPositionInsight(position);
      const insight = existingInsights.get(position.slotId);
      if (insight?.summary) {
        return {
          ...fallbackInsight,
          ...insight,
          keywords: insight.keywords.length ? insight.keywords : fallbackInsight.keywords,
          evidence: insight.evidence || fallbackInsight.evidence,
          reflection: insight.reflection || fallbackInsight.reflection
        };
      }
      return fallbackInsight;
    })
  };
}

function parseReadingJson(content, payload) {
  const trimmed = content?.trim() ?? "";
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  const jsonText = start >= 0 && end > start ? withoutFence.slice(start, end + 1) : withoutFence;

  try {
    return completeReading(JSON.parse(jsonText), payload);
  } catch {
    return fallbackReading(payload);
  }
}

async function createReading(request, env) {
  if (!env.DEEPSEEK_API_KEY) {
    return json({ error: "缺少 DEEPSEEK_API_KEY。请在 Cloudflare Worker secrets 中配置。" }, { status: 400 });
  }

  const payload = await request.json();
  if (!payload?.spread?.name || !Array.isArray(payload?.positions)) {
    return json({ error: "请求格式不完整：需要 spread 与 positions。" }, { status: 422 });
  }

  const missing = payload.positions.filter((position) => !position.card);
  if (missing.length > 0) {
    return json({ error: "还有牌位没有选择完整，无法生成解读。" }, { status: 422 });
  }

  const baseUrl = env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const model = env.DEEPSEEK_MODEL ?? "deepseek-v4-pro";
  const maxTokens = Number(env.DEEPSEEK_MAX_TOKENS ?? 10000);
  const startedAt = Date.now();

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是一位温和、清晰、负责任的塔罗解读灵感助手。你的目标不是替用户下最终判断，而是帮助用户把牌面、牌位、问题和现实处境连接起来，提供可继续联想的线索。只基于用户提供的牌阵、牌位、牌义和正逆位生成中文内容。避免宿命论、恐吓式表达和绝对化判断。总体总结可以给出一个结论性的启示；单牌部分必须更像启发式分析，说明它在这个具体问题与这个牌位中可能反映了什么。你必须只输出一个合法 JSON object，不要输出 Markdown、解释、分隔线或 JSON 之外的任何文字。"
        },
        {
          role: "user",
          content: `请为以下塔罗牌阵生成适合界面展示的结构化解读。若 topic 不为空，必须优先按 topic 指定方向解读；question 是用户的具体问题。

写作要求：
1. summary 是整体结论性的启示，不要太短，要有人情味，像在陪用户复盘这件事。5 张牌时写 120-180 个中文字符；10 张及以上必须写 2-3 句，至少 180 个中文字符，控制在 180-260 个中文字符。10 张及以上不能只写一条压缩结论，必须同时点出主线牌与补充牌之间的关系。
2. positionInsights 不是单独解释牌义。每一张牌都必须结合 question/topic、牌阵位置 title/prompt、具体牌名、正逆位来说明：它在这个问题里提供了什么观察角度。若有 6-10 号补充牌，必须把它们作为对 1-5 号主牌的现实细节补充来写，而不是孤立解释。
3. 每张牌的 keywords 必须是“问题语境关键词”，不要只写牌本身的通用关键词。例如不要只写“开始、冒险”，要写成“事业试错、关系主动、财务新机会”这种贴着问题的词。
4. 每张牌必须写 evidence，不能省略，不能留空，不能只写“基于牌名/关键词”。要明确指出这条灵感来自哪一类牌面/牌义依据，可以包括牌面人物姿态、象征物、花色元素、数字/宫廷身份、正逆位张力、牌位含义。若输入中没有足够牌面图像细节，就基于已知韦特通用象征与输入牌义说明，不要编造过度具体的画面。
5. 每张牌必须写 reflection，不能省略，不能留空。它是给用户一个可继续自己联想的问题，帮助用户自己完成解读。
6. 语气是“提供灵感”，不要写成“我已经替你算出结局”。可使用“也许、可能、值得观察、可以联想”等词。
7. 输出中每个 positionInsights 项都必须包含 slotId/title/cardName/summary/keywords/evidence/reflection 七个字段。即使有 10 张或更多牌，也不能为了简短而省略 evidence 或 reflection。

输出必须是严格 JSON，格式如下：
{
  "summary": "整体结论性的启示，5张牌120-180个中文字符；10张及以上必须2-3句且不少于180个中文字符",
  "keywords": ["结合问题的关键词1", "结合问题的关键词2", "结合问题的关键词3"],
  "positionInsights": [
    {
      "slotId": "必须使用输入里的 slotId",
      "title": "牌位名",
      "cardName": "牌名",
      "summary": "结合具体问题、牌位和正逆位的启发式分析，90-150个中文字符",
      "keywords": ["问题语境关键词1", "问题语境关键词2", "问题语境关键词3"],
      "evidence": "这条灵感来自牌面/花色/数字/宫廷身份/正逆位/牌位含义中的哪些依据，60-100个中文字符",
      "reflection": "一个引导用户自己继续联想的问题，30-60个中文字符"
    }
  ]
}
positionInsights 必须覆盖输入中的每一个牌位。不要输出 JSON 之外的任何文字。

${JSON.stringify(payload, null, 2)}`
        }
      ],
      stream: false,
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
      extra_body: {
        thinking: { type: "disabled" }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return json({ error: `DeepSeek 生成失败：${response.status} ${errorText.slice(0, 500)}` }, { status: 502 });
  }

  const completion = await response.json();
  const content = completion.choices?.[0]?.message?.content;
  return json({ reading: parseReadingJson(content, payload), durationMs: Date.now() - startedAt });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true });
    }

    if (url.pathname === "/api/readings" && request.method === "POST") {
      try {
        return await createReading(request, env);
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        return json({ error: `Worker 处理失败：${message}` }, { status: 500 });
      }
    }

    return json({ error: "Not found" }, { status: 404 });
  }
};
