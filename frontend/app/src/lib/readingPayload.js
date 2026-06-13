import { tarotCards } from "../data/tarot.js";

export function buildReadingPayload({ spread, question, topic, selections }) {
  const cardsById = new Map(tarotCards.map((card) => [card.id, card]));
  return {
    spread: {
      id: spread.id,
      name: spread.name,
      description: spread.description
    },
    question: question.trim(),
    topic: topic?.trim() ?? "",
    positions: spread.slots.map((slot) => {
      const selection = selections[slot.id];
      const card = selection?.cardId ? cardsById.get(selection.cardId) : null;
      return {
        slotId: slot.id,
        number: slot.number,
        title: slot.title,
        prompt: slot.prompt,
        orientation: selection?.orientation ?? "upright",
        card: card
          ? {
              id: card.id,
              name: card.name,
              arcana: card.arcana,
              suit: card.suit,
              rank: card.rank,
              keywords:
                selection?.orientation === "reversed" ? card.reversedKeywords : card.uprightKeywords,
              detail: card.detail,
              source: card.source
            }
          : null
      };
    })
  };
}
