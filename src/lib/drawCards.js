import { tarotCards } from "../data/tarot.js";

function pickOne(pool, rng) {
  const index = Math.floor(rng() * pool.length);
  return pool.splice(index, 1)[0];
}

export function drawCardsForSpread(spread, rng = Math.random) {
  const usedCardIds = new Set();

  return Object.fromEntries(
    spread.slots.map((slot) => {
      const availableCards = tarotCards.filter((card) => {
        if (usedCardIds.has(card.id)) return false;
        return slot.preferredArcana ? card.arcana === slot.preferredArcana : true;
      });
      const card = pickOne(availableCards, rng);
      usedCardIds.add(card.id);
      return [
        slot.id,
        {
          arcana: card.arcana,
          cardId: card.id,
          orientation: rng() < 0.5 ? "upright" : "reversed"
        }
      ];
    })
  );
}
