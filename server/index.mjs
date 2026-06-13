import cors from "cors";
import express from "express";
import fs from "node:fs";
import OpenAI from "openai";

function loadLocalEnv() {
  if (!fs.existsSync(".env")) return;
  const lines = fs.readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const app = express();
const port = Number(process.env.PORT ?? 8787);
const deepseekBaseURL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
const deepseekModel = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro";
const deepseekMaxTokens = Number(process.env.DEEPSEEK_MAX_TOKENS ?? 3200);
const deepseekTimeoutMs = Number(process.env.DEEPSEEK_TIMEOUT_MS ?? 60000);

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
    const parsed = JSON.parse(jsonText);
    return completeReading(parsed, payload);
  } catch {
    console.warn(`DeepSeek returned non-JSON content (${trimmed.length} chars); using local structured fallback.`);
    return fallbackReading(payload);
  }
}

app.use(cors({ origin: ["http://127.0.0.1:5173", "http://localhost:5173"] }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/readings", async (req, res) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(400).json({
      error: "缺少 DEEPSEEK_API_KEY。请在启动后端前设置环境变量，例如 DEEPSEEK_API_KEY=你的_key npm run dev。"
    });
    return;
  }

  const payload = req.body;
  if (!payload?.spread?.name || !Array.isArray(payload?.positions)) {
    res.status(422).json({ error: "请求格式不完整：需要 spread 与 positions。" });
    return;
  }

  const missing = payload.positions.filter((position) => !position.card);
  if (missing.length > 0) {
    res.status(422).json({ error: "还有牌位没有选择完整，无法生成解读。" });
    return;
  }

  try {
    const startedAt = Date.now();
    const client = new OpenAI({ apiKey, baseURL: deepseekBaseURL, timeout: deepseekTimeoutMs });
    const completion = await client.chat.completions.create({
      model: deepseekModel,
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
      max_tokens: deepseekMaxTokens,
      extra_body: {
        thinking: { type: "disabled" }
      }
    });

    const content = completion.choices?.[0]?.message?.content;
    const reading = parseReadingJson(content, payload);
    console.log(`DeepSeek reading generated in ${Date.now() - startedAt}ms`);
    res.json({ reading });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    res.status(502).json({ error: `DeepSeek 生成失败：${message}` });
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Tarot reading API listening on http://127.0.0.1:${port}`);
});
