import { BookOpen, ChevronDown, Loader2, MoonStar, Shuffle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { spreads as spreadData } from "./data/spreads.js";
import {
  arcanaLabels as arcanaLabelData,
  rankLabels as rankLabelData,
  suitLabels as suitLabelData,
  tarotCards as tarotCardData
} from "./data/tarot.js";
import { buildReadingPayload } from "./lib/readingPayload.js";
import { drawCardsForSpread } from "./lib/drawCards.js";
import { calculateReadingStats, describeCardElement, elementLabels } from "./lib/readingStats.js";
import type { ArcanaType, MinorSuit, SlotSelection, Spread, SpreadSlot, TarotCard } from "./types";

const allSpreads = spreadData as Spread[];
const allCards = tarotCardData as TarotCard[];
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
const arcanaLabels = arcanaLabelData as Record<ArcanaType, string>;
const rankLabels = rankLabelData as Record<string, string>;
const suitLabels = suitLabelData as Record<MinorSuit, string>;
const cardsById = new Map<string, TarotCard>(allCards.map((card) => [card.id, card]));
const majorCards = allCards.filter((card) => card.arcana === "major");
const minorCards = allCards.filter((card) => card.arcana === "minor");
const suits = Object.entries(suitLabels) as [MinorSuit, string][];
const quickTopics = ["事业", "财富", "情感", "健康"];
const elementIcons: Record<string, string> = {
  fire: "🜂",
  water: "🜄",
  air: "🜁",
  earth: "🜃"
};
const elementOrder = ["fire", "water", "air", "earth"];
const elementKeyBySuit: Record<MinorSuit, string> = {
  wands: "fire",
  cups: "water",
  swords: "air",
  pentacles: "earth"
};
const runes = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᚾ", "ᛁ", "ᛃ", "ᛇ", "ᛈ", "ᛉ", "ᛊ", "ᛏ", "ᛒ", "ᛖ", "ᛗ", "ᛚ", "ᛜ", "ᛞ", "ᛟ"];
const alchemySymbols = ["🜂", "🜄", "🜁", "🜃", "🜔", "🜍", "🜛", "🜚", "🜖", "🜏", "🜇", "🜊"];
const astrologySymbols = ["☉", "☽", "☿", "♀", "♁", "♂", "♃", "♄", "♅", "♆", "♇", "☊"];

interface PositionInsight {
  slotId: string;
  title: string;
  cardName: string;
  summary: string;
  keywords: string[];
  evidence?: string;
  reflection?: string;
}

interface ReadingResult {
  summary: string;
  keywords: string[];
  positionInsights: PositionInsight[];
  clientDurationMs?: number;
  serverDurationMs?: number;
}

interface GenerationMeta {
  cardCount: number;
  startedAt: number;
  clientDurationMs?: number;
  serverDurationMs?: number;
}

function emptySelections(spread: Spread): Record<string, SlotSelection> {
  return Object.fromEntries(
    spread.slots.map((slot) => [
      slot.id,
      {
        arcana: slot.preferredArcana ?? "",
        cardId: "",
        orientation: "upright"
      }
    ])
  );
}

function getSlotCard(selection?: SlotSelection): TarotCard | undefined {
  return selection?.cardId ? cardsById.get(selection.cardId) : undefined;
}

function getCardElementKey(card?: TarotCard): string {
  if (!card) return "";
  if (card.arcana === "major") return "major";
  return card.suit ? elementKeyBySuit[card.suit] : "";
}

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return "";
  const seconds = ms / 1000;
  return seconds < 60 ? `${seconds.toFixed(1)} 秒` : `${Math.floor(seconds / 60)} 分 ${Math.round(seconds % 60)} 秒`;
}

function estimateGenerationText(cardCount: number): string {
  if (cardCount <= 5) return "预计 20-40 秒";
  if (cardCount <= 10) return "预计 45-90 秒";
  return "预计 60-120 秒";
}

function normalizeReadingResult(value: unknown): ReadingResult {
  if (typeof value === "string") {
    return {
      summary: value.slice(0, 160),
      keywords: ["综合解读"],
      positionInsights: []
    };
  }

  const candidate = value as Partial<ReadingResult> | undefined;
  return {
    summary: candidate?.summary || "已生成牌阵解读。",
    keywords: Array.isArray(candidate?.keywords) ? candidate.keywords.slice(0, 6).map(String) : [],
    positionInsights: Array.isArray(candidate?.positionInsights)
      ? candidate.positionInsights.map((item) => ({
          slotId: String(item.slotId ?? ""),
          title: String(item.title ?? ""),
          cardName: String(item.cardName ?? ""),
          summary: String(item.summary ?? ""),
          keywords: Array.isArray(item.keywords) ? item.keywords.slice(0, 5).map(String) : [],
          evidence: String(item.evidence ?? ""),
          reflection: String(item.reflection ?? "")
        }))
      : []
  };
}

export function App() {
  const [spreadId, setSpreadId] = useState(allSpreads[0].id);
  const activeSpread = allSpreads.find((spread) => spread.id === spreadId) ?? allSpreads[0];
  const [selections, setSelections] = useState<Record<string, SlotSelection>>(() =>
    emptySelections(activeSpread)
  );
  const [question, setQuestion] = useState("");
  const [topic, setTopic] = useState("");
  const [activeSlotId, setActiveSlotId] = useState(activeSpread.slots[0].id);
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
  const [readingResult, setReadingResult] = useState<ReadingResult | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMeta, setGenerationMeta] = useState<GenerationMeta | null>(null);

  const activeSlot = activeSpread.slots.find((slot: SpreadSlot) => slot.id === activeSlotId) ?? activeSpread.slots[0];
  const activeSelection = selections[activeSlot.id];
  const completedCount = activeSpread.slots.filter((slot: SpreadSlot) => selections[slot.id]?.cardId).length;
  const isAdvancedBasic = activeSpread.id === "advanced-basic";
  const basicPrimarySlots = activeSpread.slots.filter((slot: SpreadSlot) => slot.number >= 1 && slot.number <= 5);
  const basicSupplementSlots = activeSpread.slots.filter((slot: SpreadSlot) => slot.number >= 6 && slot.number <= 10);
  const basicPrimaryComplete =
    isAdvancedBasic && basicPrimarySlots.every((slot: SpreadSlot) => selections[slot.id]?.cardId);
  const allComplete = completedCount === activeSpread.slots.length;
  const canGenerate = isAdvancedBasic ? basicPrimaryComplete : allComplete;
  const drawButtonLabel =
    isAdvancedBasic && basicPrimaryComplete && !allComplete
      ? "补充抽牌"
      : isAdvancedBasic && allComplete
        ? "重新抽牌"
        : "一键抽牌";
  const detailSlot =
    activeSpread.slots.find((slot: SpreadSlot) => slot.id === hoveredSlotId) ?? activeSlot;
  const detailSelection = selections[detailSlot.id];
  const detailCard = getSlotCard(detailSelection);
  const previewSlot = activeSpread.slots.find((slot: SpreadSlot) => slot.id === hoveredSlotId);
  const previewSelection = previewSlot ? selections[previewSlot.id] : undefined;
  const previewCard = getSlotCard(previewSelection);
  const readingStats = calculateReadingStats(selections);
  const elementFlow = elementOrder.map((key) => ({
    key,
    label: elementLabels[key as keyof typeof elementLabels],
    icon: elementIcons[key],
    count: readingStats.elements[key as keyof typeof readingStats.elements],
    strength: readingStats.elementTotal
      ? readingStats.elements[key as keyof typeof readingStats.elements] / readingStats.elementTotal
      : 0
  }));
  const insightBySlotId = useMemo(
    () => new Map((readingResult?.positionInsights ?? []).map((insight) => [insight.slotId, insight])),
    [readingResult]
  );
  const detailInsight = insightBySlotId.get(detailSlot.id);

  const groupedMinorCards = useMemo(
    () =>
      suits.map(([suit, label]) => ({
        suit,
        label,
        cards: minorCards.filter((card: TarotCard) => card.suit === suit)
      })),
    []
  );

  function changeSpread(nextSpreadId: string) {
    const nextSpread = allSpreads.find((spread) => spread.id === nextSpreadId) ?? allSpreads[0];
    setSpreadId(nextSpread.id);
    setSelections(emptySelections(nextSpread));
    setActiveSlotId(nextSpread.slots[0].id);
    setHoveredSlotId(null);
    setReadingResult(null);
    setError("");
    setGenerationMeta(null);
    setTopic("");
  }

  function updateSlot(slotId: string, patch: Partial<SlotSelection>) {
    setSelections((current) => ({
      ...current,
      [slotId]: {
        ...current[slotId],
        ...patch
      }
    }));
  }

  function changeArcana(slot: SpreadSlot, arcana: ArcanaType) {
    updateSlot(slot.id, { arcana, cardId: "" });
  }

  function drawAllCards() {
    if (isAdvancedBasic) {
      if (basicPrimaryComplete && !allComplete) {
        const supplementalSelections = drawCardsForSpread(activeSpread, Math.random, {
          slotIds: basicSupplementSlots.map((slot: SpreadSlot) => slot.id),
          existingSelections: selections
        }) as Record<string, SlotSelection>;
        setSelections((current) => ({ ...current, ...supplementalSelections }));
        setActiveSlotId(basicSupplementSlots[0]?.id ?? activeSpread.slots[0].id);
      } else {
        const resetSelections = emptySelections(activeSpread);
        const primarySelections = drawCardsForSpread(activeSpread, Math.random, {
          slotIds: basicPrimarySlots.map((slot: SpreadSlot) => slot.id)
        }) as Record<string, SlotSelection>;
        setSelections({ ...resetSelections, ...primarySelections });
        setActiveSlotId(basicPrimarySlots[0]?.id ?? activeSpread.slots[0].id);
      }
    } else {
      const drawnSelections = drawCardsForSpread(activeSpread) as Record<string, SlotSelection>;
      setSelections(drawnSelections);
      setActiveSlotId(activeSpread.slots[0].id);
    }
    setHoveredSlotId(null);
    setReadingResult(null);
    setError("");
    setGenerationMeta(null);
  }

  async function generateReading() {
    const payload = buildReadingPayload({ spread: activeSpread, question, topic, selections });
    const startedAt = performance.now();
    setGenerationMeta({ cardCount: payload.positions.length, startedAt });
    setIsGenerating(true);
    setError("");
    setReadingResult(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(`${apiBaseUrl}/api/readings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? "生成解读失败");
      }
      const clientDurationMs = performance.now() - startedAt;
      const nextReading = normalizeReadingResult(body.reading);
      nextReading.clientDurationMs = clientDurationMs;
      nextReading.serverDurationMs = Number(body.durationMs) || undefined;
      setGenerationMeta({
        cardCount: payload.positions.length,
        startedAt,
        clientDurationMs,
        serverDurationMs: nextReading.serverDurationMs
      });
      setReadingResult(nextReading);
    } catch (err) {
      const clientDurationMs = performance.now() - startedAt;
      setGenerationMeta((current) =>
        current
          ? {
              ...current,
              clientDurationMs
            }
          : null
      );
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("DeepSeek 响应超时，请稍后重试，或缩短问题/牌阵内容。");
      } else {
        setError(err instanceof Error ? err.message : "生成解读失败");
      }
    } finally {
      window.clearTimeout(timeout);
      setIsGenerating(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="side-panel">
          <div className="brand">
            <div className="brand-mark">
              <MoonStar size={24} />
            </div>
            <div>
              <p>Tarot Workbench</p>
              <h1>Tarot-Helper</h1>
            </div>
          </div>

          <label className="field-label" htmlFor="spread">
            牌阵
          </label>
          <div className="select-shell">
            <select id="spread" value={activeSpread.id} onChange={(event) => changeSpread(event.target.value)}>
              {allSpreads.map((spread) => (
                <option key={spread.id} value={spread.id}>
                  {spread.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </div>

          <div className="spread-copy">
            <h2>{activeSpread.subtitle}</h2>
            <p>{activeSpread.description}</p>
          </div>

          <label className="field-label" htmlFor="question">
            问题 / 主题
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="例如：未来三个月这段关系会如何发展？"
          />
          <div className="quick-topics" aria-label="快捷解读方向">
            {quickTopics.map((item) => (
              <button
                key={item}
                className={topic === item ? "is-selected" : ""}
                onClick={() => setTopic((current) => (current === item ? "" : item))}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="completion">
            <span>{completedCount}/{activeSpread.slots.length}</span>
            <div>
              <strong>牌位完成度</strong>
              <div className="progress">
                <i style={{ width: `${(completedCount / activeSpread.slots.length) * 100}%` }} />
              </div>
            </div>
          </div>

          <section className="stats-panel">
            <div>
              <p>全局辅助解读</p>
              <h2>牌面统计</h2>
            </div>
            <div className="orientation-pair">
              <div>
                <span>正位</span>
                <strong>{readingStats.orientation.upright}</strong>
              </div>
              <div>
                <span>逆位</span>
                <strong>{readingStats.orientation.reversed}</strong>
              </div>
            </div>
            <div className="ratio-bar orientation-ratio">
              <i
                style={{
                  width: `${readingStats.total ? (readingStats.orientation.upright / readingStats.total) * 100 : 0}%`
                }}
              />
              <b
                style={{
                  width: `${readingStats.total ? (readingStats.orientation.reversed / readingStats.total) * 100 : 0}%`
                }}
              />
            </div>
            <div className="element-ratio-bar">
              {Object.entries(elementLabels).map(([key, label]) => (
                <i
                  key={key}
                  className={`element-${key}`}
                  title={`${label} ${readingStats.elements[key as keyof typeof readingStats.elements]}`}
                  style={{
                    width: `${
                      readingStats.elementTotal
                        ? (readingStats.elements[key as keyof typeof readingStats.elements] /
                            readingStats.elementTotal) *
                          100
                        : 0
                    }%`
                  }}
                />
              ))}
            </div>
            <div className="element-grid">
              {Object.entries(elementLabels).map(([key, label]) => (
                <div key={key} className={`element-chip element-${key}`}>
                  <span className="element-mark" aria-hidden="true">{elementIcons[key]}</span>
                  <span className="element-name">{label}</span>
                  <strong>{readingStats.elements[key as keyof typeof readingStats.elements]}</strong>
                </div>
              ))}
            </div>
            <div className="element-flow" aria-label="元素流动图">
              <div className="flow-orbit" aria-hidden="true">
                {elementFlow.map((item, index) => (
                  <span
                    key={item.key}
                    className={`flow-node element-${item.key} ${item.count ? "has-count" : ""}`}
                    style={
                      {
                        "--angle": `${index * 90 - 45}deg`,
                        "--strength": item.strength
                      } as CSSProperties
                    }
                  >
                    {item.icon}
                  </span>
                ))}
              </div>
              <div className="flow-caption">
                {readingStats.dominantElement ? (
                  <>
                    <span>{elementIcons[readingStats.dominantElement]}</span>
                    <strong>{elementLabels[readingStats.dominantElement as keyof typeof elementLabels]}流动最强</strong>
                  </>
                ) : (
                  <>
                    <span>✦</span>
                    <strong>元素保持均衡</strong>
                  </>
                )}
              </div>
            </div>
          </section>
        </aside>

        <section className="board-panel">
          <div className="board-heading">
            <div>
              <p>当前牌阵</p>
              <h2>{activeSpread.name}</h2>
            </div>
            <div className="board-actions">
              <button className="secondary-button" disabled={isGenerating} onClick={drawAllCards}>
                <Shuffle size={18} />
                {drawButtonLabel}
              </button>
              <button className="primary-button" disabled={!canGenerate || isGenerating} onClick={generateReading}>
                {isGenerating ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                {isGenerating ? "生成中..." : "生成解读"}
              </button>
            </div>
          </div>

          <section className={`board-summary ${error ? "has-error" : ""} ${!readingResult && !error ? "is-pending" : ""}`}>
            <p>{error ? "生成遇到问题" : readingResult ? "总结性结论" : "AI 解读"}</p>
            <h3>
              {error ||
                (isGenerating && generationMeta
                  ? `${generationMeta.cardCount} 张牌正在生成解读，${estimateGenerationText(generationMeta.cardCount)}。10 张完整牌阵会更细，通常比 5 张明显久一些。`
                  : readingResult?.summary) ||
                (allComplete
                  ? "等待 AI 解读。点击「生成解读」后，这里会给出整组牌的结论性启示。"
                  : isAdvancedBasic && basicPrimaryComplete
                    ? "等待 AI 解读。当前会先基于 1-5 号基础牌生成启示；补充抽牌后可再结合 6-10 号细节重解。"
                    : "等待 AI 解读。先完成必要牌位，系统会在这里整理整组牌的核心启示。")}
            </h3>
              {!error && readingResult?.keywords.length ? (
                <div className="summary-keywords">
                  {readingResult.keywords.map((keyword) => (
                    <span key={keyword}>{keyword}</span>
                  ))}
                </div>
              ) : null}
              {!error && generationMeta && (isGenerating || generationMeta.clientDurationMs) ? (
                <div className="generation-timing">
                  <span>{generationMeta.cardCount} 张牌</span>
                  {isGenerating ? (
                    <span>{estimateGenerationText(generationMeta.cardCount)}</span>
                  ) : (
                    <>
                      <span>本次用时 {formatDuration(generationMeta.clientDurationMs)}</span>
                      {generationMeta.serverDurationMs ? (
                        <span>模型耗时 {formatDuration(generationMeta.serverDurationMs)}</span>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
          </section>

          <div
            className={`spread-board ${
              readingStats.dominantElement ? `dominant-${readingStats.dominantElement}` : ""
            }`}
            aria-label={`${activeSpread.name} 牌位布局`}
          >
            <div className="symbol-ring rune-ring spin-clockwise" aria-hidden="true">
              {runes.map((rune, index) => (
                <span
                  key={`${rune}-${index}`}
                  style={
                    {
                      "--angle": `${(360 / runes.length) * index}deg`,
                      "--radius": "min(28vh, 218px)"
                    } as CSSProperties
                  }
                >
                  {rune}
                </span>
              ))}
            </div>
            <div className="symbol-ring alchemy-ring spin-counter" aria-hidden="true">
              {alchemySymbols.map((symbol, index) => (
                <span
                  key={`${symbol}-${index}`}
                  style={
                    {
                      "--angle": `${(360 / alchemySymbols.length) * index}deg`,
                      "--radius": "min(22vh, 168px)"
                    } as CSSProperties
                  }
                >
                  {symbol}
                </span>
              ))}
            </div>
            <div className="symbol-ring astrology-ring spin-clockwise-slow" aria-hidden="true">
              {astrologySymbols.map((symbol, index) => (
                <span
                  key={`${symbol}-${index}`}
                  style={
                    {
                      "--angle": `${(360 / astrologySymbols.length) * index}deg`,
                      "--radius": "min(15vh, 112px)"
                    } as CSSProperties
                  }
                >
                  {symbol}
                </span>
              ))}
            </div>
            {previewSlot && previewSelection && previewCard?.imageUrl && (
              <div
                className="card-zoom-preview"
                style={{
                  left: `${Math.min(Math.max(previewSlot.x + previewSlot.w / 2, 18), 82)}%`,
                  top: `${Math.min(Math.max(previewSlot.y + previewSlot.h / 2, 30), 70)}%`
                }}
                aria-hidden="true"
              >
                <img
                  className={previewSelection.orientation === "reversed" ? "is-reversed" : ""}
                  src={previewCard.imageUrl}
                  alt=""
                />
                <strong>{previewCard.name}</strong>
                <small>{previewSelection.orientation === "reversed" ? "逆位" : "正位"}</small>
              </div>
            )}
            {activeSpread.slots.map((slot) => {
              const selection = selections[slot.id];
              const card = getSlotCard(selection);
              const isActive = slot.id === activeSlot.id;
              const cardElementKey = getCardElementKey(card);
              return (
                <button
                  key={slot.id}
                  className={`slot-card ${isActive ? "is-active" : ""} ${card ? "is-filled" : ""} ${
                    cardElementKey ? `card-element-${cardElementKey}` : ""
                  }`}
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  onClick={() => setActiveSlotId(slot.id)}
                  onMouseEnter={() => setHoveredSlotId(slot.id)}
                  onMouseLeave={() => setHoveredSlotId(null)}
                >
                  <span>{slot.number}</span>
                  {card?.imageUrl && (
                    <div className="card-image-frame" aria-hidden="true">
                      <img
                        className={selection.orientation === "reversed" ? "is-reversed" : ""}
                        src={card.imageUrl}
                        alt={`${card.name}${selection.orientation === "reversed" ? "逆位" : "正位"}牌面`}
                      />
                    </div>
                  )}
                  <div className="slot-copy">
                    <strong>{slot.title}</strong>
                    <em>{card ? card.name : "待选牌"}</em>
                    {card && <small>{selection.orientation === "reversed" ? "逆位" : "正位"}</small>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="editor-panel">
          <div className="panel-title">
            <BookOpen size={18} />
            <div>
              <p>牌位编辑</p>
              <h2>{activeSlot.number}. {activeSlot.title}</h2>
            </div>
          </div>
          <p className="slot-prompt">{activeSlot.prompt}</p>

          <div className="segmented">
            {(["major", "minor"] as ArcanaType[]).map((arcana) => (
              <button
                key={arcana}
                className={activeSelection.arcana === arcana ? "is-selected" : ""}
                onClick={() => changeArcana(activeSlot, arcana)}
              >
                {arcanaLabels[arcana]}
              </button>
            ))}
          </div>

          <label className="field-label" htmlFor="card">
            具体牌
          </label>
          <div className="select-shell">
            <select
              id="card"
              value={activeSelection.cardId}
              onChange={(event) => updateSlot(activeSlot.id, { cardId: event.target.value })}
            >
              <option value="">选择一张牌</option>
              {activeSelection.arcana === "major" &&
                majorCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              {activeSelection.arcana === "minor" &&
                groupedMinorCards.map((group) => (
                  <optgroup key={group.suit} label={group.label}>
                    {group.cards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}（{rankLabels[card.rank!]}）
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
            <ChevronDown size={16} />
          </div>

          <div className="segmented">
            <button
              className={activeSelection.orientation === "upright" ? "is-selected" : ""}
              onClick={() => updateSlot(activeSlot.id, { orientation: "upright" })}
            >
              正位
            </button>
            <button
              className={activeSelection.orientation === "reversed" ? "is-selected" : ""}
              onClick={() => updateSlot(activeSlot.id, { orientation: "reversed" })}
            >
              逆位
            </button>
          </div>

          <section
            className={`detail-panel ${
              detailCard ? `card-element-${getCardElementKey(detailCard)}` : ""
            }`}
          >
            <p>牌义详情</p>
            {detailCard ? (
              <>
                <h3>{detailCard.name} · {detailSelection.orientation === "reversed" ? "逆位" : "正位"}</h3>
                <div className="keyword-row">
                  {(detailSelection.orientation === "reversed"
                    ? detailCard.reversedKeywords
                    : detailCard.uprightKeywords
                  ).map((keyword) => (
                    <span key={keyword}>{keyword}</span>
                  ))}
                  <span>{describeCardElement(detailCard)}</span>
                </div>
                <p>{detailCard.detail}</p>
                <small>{detailSlot.title}：{detailSlot.prompt}</small>
                <div className={`ai-card-reading ${detailInsight ? "" : "is-pending"}`}>
                  <p>AI 牌位解读</p>
                  {detailInsight ? (
                    <>
                      <h4>{detailInsight.title || detailSlot.title}</h4>
                      <div className="keyword-row">
                        {detailInsight.keywords.map((keyword) => (
                          <span key={keyword}>{keyword}</span>
                        ))}
                      </div>
                      <p>{detailInsight.summary}</p>
                      {detailInsight.evidence && (
                        <div className="ai-evidence">
                          <strong>牌面依据</strong>
                          <span>{detailInsight.evidence}</span>
                        </div>
                      )}
                      {detailInsight.reflection && (
                        <div className="ai-reflection">
                          <strong>继续联想</strong>
                          <span>{detailInsight.reflection}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h4>{detailSlot.title}</h4>
                      <p>等待 AI 解读。生成后这里会结合你的问题、牌位含义和这张牌的正逆位，给出可供你继续联想的线索。</p>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-detail">悬停或点击已选牌位后，会在这里显示对应牌义。</div>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
