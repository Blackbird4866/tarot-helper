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
    keywords
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
          title: String(item.title ?? ""),
          cardName: String(item.cardName ?? ""),
          summary: String(item.summary ?? ""),
          keywords: compactKeywords(item.keywords ?? [], 5)
        }
      ])
  );

  return {
    summary: String(parsed?.summary || fallback.summary),
    keywords: compactKeywords(parsed?.keywords ?? fallback.keywords, 6),
    positionInsights: payload.positions.map((position) => {
      const insight = existingInsights.get(position.slotId);
      if (insight?.summary) {
        return {
          ...fallbackPositionInsight(position),
          ...insight,
          keywords: insight.keywords.length ? insight.keywords : fallbackPositionInsight(position).keywords
        };
      }
      return fallbackPositionInsight(position);
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
  const maxTokens = Number(env.DEEPSEEK_MAX_TOKENS ?? 3200);

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
            "你是一位温和、清晰、负责任的塔罗解读辅助写作者。只基于用户提供的牌阵、牌位、牌义和正逆位生成中文解读。避免宿命论和绝对化判断，把塔罗结果表达为反思与行动建议。你必须只输出一个合法 JSON object，不要输出 Markdown、解释、分隔线或 JSON 之外的任何文字。"
        },
        {
          role: "user",
          content: `请为以下塔罗牌阵生成适合界面展示的结构化解读。若 topic 不为空，必须优先按 topic 指定方向解读；question 是用户的具体问题。输出必须是严格 JSON，格式如下：
{
  "summary": "一句总结性结论，80字以内",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "positionInsights": [
    {
      "slotId": "必须使用输入里的 slotId",
      "title": "牌位名",
      "cardName": "牌名",
      "summary": "这张牌在这个牌位上的含义，90字以内",
      "keywords": ["关键词1", "关键词2", "关键词3"]
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
  return json({ reading: parseReadingJson(content, payload) });
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
