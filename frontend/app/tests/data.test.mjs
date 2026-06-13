import assert from "node:assert/strict";
import test from "node:test";
import { spreads } from "../src/data/spreads.js";
import { tarotCards } from "../src/data/tarot.js";
import { buildReadingPayload } from "../src/lib/readingPayload.js";
import { drawCardsForSpread } from "../src/lib/drawCards.js";
import { calculateReadingStats } from "../src/lib/readingStats.js";

test("牌库包含完整 78 张塔罗牌", () => {
  assert.equal(tarotCards.length, 78);
  assert.equal(tarotCards.filter((card) => card.arcana === "major").length, 22);
  assert.equal(tarotCards.filter((card) => card.arcana === "minor").length, 56);
  for (const card of tarotCards) {
    assert.ok(card.id);
    assert.ok(card.name);
    assert.ok(card.uprightKeywords.length > 0);
    assert.ok(card.reversedKeywords.length > 0);
    assert.ok(card.detail);
    assert.ok(card.source);
    assert.ok(card.imageUrl);
  }
});

test("牌阵配置符合 v1 计划数量", () => {
  const byId = new Map(spreads.map((spread) => [spread.id, spread]));
  assert.equal(byId.get("advanced-basic").slots.length, 10);
  assert.equal(byId.get("choice").slots.length, 9);
  assert.equal(byId.get("time-12").slots.length, 13);
  assert.equal(byId.get("time-7").slots.length, 7);
  assert.equal(byId.get("lover-pyramid").slots.length, 4);
  assert.equal(byId.get("overall-fortune").slots.length, 7);
});

test("每个牌阵的牌框尺寸统一且不越界", () => {
  for (const spread of spreads) {
    for (const slot of spread.slots) {
      assert.equal(slot.w, 10, `${spread.id}/${slot.id} 宽度应统一`);
      assert.equal(slot.h, 29, `${spread.id}/${slot.id} 高度应统一`);
      assert.ok(slot.x >= 0 && slot.x + slot.w <= 100, `${spread.id}/${slot.id} 横向越界`);
      assert.ok(slot.y >= 0 && slot.y + slot.h <= 100, `${spread.id}/${slot.id} 纵向越界`);
    }
  }
});

test("线性牌阵保持同一水平线", () => {
  const byId = new Map(spreads.map((spread) => [spread.id, spread]));
  const sevenDayRows = new Set(byId.get("time-7").slots.map((slot) => slot.y));
  assert.equal(sevenDayRows.size, 1);

  const monthSlots = byId.get("time-12").slots.filter((slot) => slot.id.startsWith("month-"));
  assert.equal(new Set(monthSlots.slice(0, 6).map((slot) => slot.y)).size, 1);
  assert.equal(new Set(monthSlots.slice(6).map((slot) => slot.y)).size, 1);
});

test("生成请求 payload 包含牌阵、问题、牌位与牌义摘要", () => {
  const spread = spreads.find((item) => item.id === "lover-pyramid");
  const selections = Object.fromEntries(
    spread.slots.map((slot, index) => [
      slot.id,
      {
        arcana: "major",
        cardId: tarotCards[index].id,
        orientation: index % 2 === 0 ? "upright" : "reversed"
      }
    ])
  );
  const payload = buildReadingPayload({ spread, question: "关系未来三个月", topic: "情感", selections });
  assert.equal(payload.spread.name, "恋人金字塔");
  assert.equal(payload.question, "关系未来三个月");
  assert.equal(payload.topic, "情感");
  assert.equal(payload.positions.length, 4);
  assert.equal(payload.positions[0].card.name, "愚人");
  assert.deepEqual(payload.positions[1].card.keywords, tarotCards[1].reversedKeywords);
});

test("生成请求 payload 会过滤未选择的牌位", () => {
  const spread = spreads.find((item) => item.id === "advanced-basic");
  const selections = Object.fromEntries(
    spread.slots.map((slot) => [
      slot.id,
      {
        arcana: slot.preferredArcana ?? "",
        cardId: slot.number <= 5 ? tarotCards[slot.number - 1].id : "",
        orientation: "upright"
      }
    ])
  );
  const payload = buildReadingPayload({ spread, question: "先看主线", topic: "事业", selections });
  assert.equal(payload.positions.length, 5);
  assert.deepEqual(payload.positions.map((position) => position.number), [1, 2, 3, 4, 5]);
});

test("一键抽牌会填满当前牌阵并尊重牌位偏好", () => {
  const spread = spreads.find((item) => item.id === "advanced-basic");
  const selections = drawCardsForSpread(spread, () => 0.1);
  assert.equal(Object.keys(selections).length, spread.slots.length);
  assert.equal(new Set(Object.values(selections).map((selection) => selection.cardId)).size, spread.slots.length);
  for (const slot of spread.slots) {
    const selection = selections[slot.id];
    const card = tarotCards.find((item) => item.id === selection.cardId);
    assert.ok(card);
    assert.ok(["upright", "reversed"].includes(selection.orientation));
    if (slot.preferredArcana) {
      assert.equal(card.arcana, slot.preferredArcana);
    }
  }
});

test("基础牌阵支持先抽 1-5 号大牌，再补抽 6-10 号小牌", () => {
  const spread = spreads.find((item) => item.id === "advanced-basic");
  const primarySlotIds = spread.slots.filter((slot) => slot.number <= 5).map((slot) => slot.id);
  const supplementSlotIds = spread.slots.filter((slot) => slot.number > 5).map((slot) => slot.id);

  const primarySelections = drawCardsForSpread(spread, () => 0.1, { slotIds: primarySlotIds });
  assert.equal(Object.keys(primarySelections).length, 5);
  assert.deepEqual(Object.keys(primarySelections), primarySlotIds);
  assert.ok(
    Object.values(primarySelections).every((selection) => {
      const card = tarotCards.find((item) => item.id === selection.cardId);
      return card?.arcana === "major";
    })
  );

  const supplementSelections = drawCardsForSpread(spread, () => 0.1, {
    slotIds: supplementSlotIds,
    existingSelections: primarySelections
  });
  assert.equal(Object.keys(supplementSelections).length, 5);
  assert.deepEqual(Object.keys(supplementSelections), supplementSlotIds);
  assert.equal(
    new Set([...Object.values(primarySelections), ...Object.values(supplementSelections)].map((selection) => selection.cardId)).size,
    10
  );
  assert.ok(
    Object.values(supplementSelections).every((selection) => {
      const card = tarotCards.find((item) => item.id === selection.cardId);
      return card?.arcana === "minor";
    })
  );
});

test("没有指定大小牌的牌阵默认从 78 张牌中不重复随机", () => {
  const spread = spreads.find((item) => item.id === "overall-fortune");
  const rngValues = [0, 0, 0.99, 0, 0.25, 0, 0.75, 0, 0.5, 0, 0.1, 0, 0.9, 0];
  const selections = drawCardsForSpread(spread, () => rngValues.shift() ?? 0.5);
  const selectedCards = Object.values(selections).map((selection) =>
    tarotCards.find((card) => card.id === selection.cardId)
  );
  assert.equal(selectedCards.length, spread.slots.length);
  assert.equal(new Set(selectedCards.map((card) => card.id)).size, spread.slots.length);
  assert.ok(selectedCards.some((card) => card.arcana === "major"));
  assert.ok(selectedCards.some((card) => card.arcana === "minor"));
});

test("全局辅助解读统计正逆位和四元素", () => {
  const selections = {
    a: { cardId: "major-fool", orientation: "upright" },
    b: { cardId: "minor-wands-ace", orientation: "reversed" },
    c: { cardId: "minor-cups-two", orientation: "upright" },
    d: { cardId: "minor-swords-three", orientation: "reversed" },
    e: { cardId: "minor-pentacles-four", orientation: "upright" }
  };
  const stats = calculateReadingStats(selections);
  assert.equal(stats.total, 5);
  assert.equal(stats.elementTotal, 4);
  assert.equal(stats.orientation.upright, 3);
  assert.equal(stats.orientation.reversed, 2);
  assert.deepEqual(stats.elements, {
    fire: 1,
    water: 1,
    air: 1,
    earth: 1
  });
  assert.equal(stats.dominantElement, "");
});

test("四元素唯一最多时返回主导元素", () => {
  const stats = calculateReadingStats({
    a: { cardId: "minor-wands-ace", orientation: "upright" },
    b: { cardId: "minor-wands-two", orientation: "reversed" },
    c: { cardId: "minor-cups-two", orientation: "upright" },
    d: { cardId: "major-fool", orientation: "reversed" }
  });

  assert.equal(stats.elementTotal, 3);
  assert.equal(stats.dominantElement, "fire");
});
