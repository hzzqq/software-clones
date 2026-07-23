import type { Card } from '../types';

/** Case-insensitive filter across title and description. */
export function filterCardsByQuery(query: string, cards: Card[]): Card[] {
  const q = query.trim().toLowerCase();
  if (!q) return cards;
  return cards.filter(
    (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  );
}
