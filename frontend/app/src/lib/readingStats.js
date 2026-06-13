import { tarotCards } from "../data/tarot.js";

const elementBySuit = {
  wands: "火",
  cups: "水",
  swords: "风",
  pentacles: "土"
};

export const elementLabels = {
  fire: "火元素",
  water: "水元素",
  air: "风元素",
  earth: "土元素"
};

const elementKeyBySuit = {
  wands: "fire",
  cups: "water",
  swords: "air",
  pentacles: "earth"
};

export function calculateReadingStats(selections) {
  const cardsById = new Map(tarotCards.map((card) => [card.id, card]));
  const stats = {
    total: 0,
    elementTotal: 0,
    dominantElement: "",
    orientation: {
      upright: 0,
      reversed: 0
    },
    elements: {
      fire: 0,
      water: 0,
      air: 0,
      earth: 0
    }
  };

  for (const selection of Object.values(selections)) {
    if (!selection?.cardId) continue;
    const card = cardsById.get(selection.cardId);
    if (!card) continue;
    stats.total += 1;
    stats.orientation[selection.orientation] += 1;
    if (card.arcana === "minor" && card.suit) {
      stats.elementTotal += 1;
      stats.elements[elementKeyBySuit[card.suit]] += 1;
    }
  }

  const elementEntries = Object.entries(stats.elements);
  const highestElementCount = Math.max(...elementEntries.map(([, count]) => count));
  const dominantElements = elementEntries.filter(([, count]) => count === highestElementCount && count > 0);
  stats.dominantElement = dominantElements.length === 1 ? dominantElements[0][0] : "";

  return stats;
}

export function describeCardElement(card) {
  if (!card) return "";
  if (card.arcana === "major") return "大阿卡纳";
  return `${elementBySuit[card.suit]}元素`;
}
