export type ArcanaType = "major" | "minor";
export type Orientation = "upright" | "reversed";
export type MinorSuit = "wands" | "cups" | "swords" | "pentacles";
export type MinorRank =
  | "ace"
  | "two"
  | "three"
  | "four"
  | "five"
  | "six"
  | "seven"
  | "eight"
  | "nine"
  | "ten"
  | "page"
  | "knight"
  | "queen"
  | "king";

export interface TarotCard {
  id: string;
  name: string;
  arcana: ArcanaType;
  suit?: MinorSuit;
  rank?: MinorRank;
  uprightKeywords: string[];
  reversedKeywords: string[];
  detail: string;
  source: string;
  imageUrl?: string;
}

export interface SpreadSlot {
  id: string;
  number: number;
  title: string;
  prompt: string;
  preferredArcana?: ArcanaType;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Spread {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  source: string;
  slots: SpreadSlot[];
}

export interface SlotSelection {
  arcana: ArcanaType | "";
  cardId: string;
  orientation: Orientation;
}
