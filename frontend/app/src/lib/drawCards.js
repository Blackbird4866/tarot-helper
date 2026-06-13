import { tarotCards } from "../data/tarot.js";

function pickOne(pool, rng) {
  const index = Math.floor(rng() * pool.length);
  return pool.splice(index, 1)[0];
}

export function drawCardsForSpread(spread, rng = Math.random, options = {}) {
  const targetSlotIds = new Set(options.slotIds ?? spread.slots.map((slot) => slot.id));
  const existingSelections = options.existingSelections ?? {};
  const usedCardIds = new Set(
    Object.entries(existingSelections)
      .filter(([slotId, selection]) => !targetSlotIds.has(slotId) && selection?.cardId)
      .map(([, selection]) => selection.cardId)
  );

  return Object.fromEntries(
    spread.slots.filter((slot) => targetSlotIds.has(slot.id)).map((slot) => {
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
