import { Card } from '../types';

/**
 * Pure re-ordering logic for a kanban drag-and-drop move. Given the current
 * list of cards, the dragged card id and the drop target, it returns a NEW
 * array with every affected card's `position` (and the moved card's
 * `listId`) updated consistently.
 *
 * `overId` is either a card id or `list-<id>` when dropped onto an empty
 * column droppable. Extracted verbatim from `useBoard.moveCard` so the
 * position/ordering logic can be unit-tested without React.
 */
export function reorderCards(cards: Card[], activeId: number, overId: string): Card[] {
  const all: Card[] = cards.map((c) => ({ ...c }));
  const activeIdx: number = all.findIndex((c) => c.id === activeId);
  if (activeIdx < 0) return cards;

  const active: Card = all[activeIdx];
  let targetListId: number = active.listId;
  let targetIndex: number;

  if (overId.startsWith('list-')) {
    targetListId = Number(overId.slice(5));
    const targetCards = all.filter((c) => c.listId === targetListId && c.id !== activeId);
    targetIndex = targetCards.length;
  } else {
    const overCard = all.find((c) => c.id === Number(overId));
    if (!overCard) return cards;
    targetListId = overCard.listId;
    const targetCards = all.filter((c) => c.listId === targetListId && c.id !== activeId);
    const idx = targetCards.findIndex((c) => c.id === overCard.id);
    targetIndex = idx < 0 ? targetCards.length : idx;
  }

  const sourceListId: number = active.listId;
  const without = all.filter((c) => c.id !== activeId);
  const sourceCards = without.filter((c) => c.listId === sourceListId);
  const targetCards =
    targetListId === sourceListId
      ? sourceCards
      : without.filter((c) => c.listId === targetListId);

  const moved: Card = { ...active, listId: targetListId, position: targetIndex };
  targetCards.splice(targetIndex, 0, moved);

  const others = without.filter(
    (c) => c.listId !== sourceListId && c.listId !== targetListId
  );
  sourceCards.forEach((c, i) => {
    c.position = i;
  });
  targetCards.forEach((c, i) => {
    c.position = i;
  });

  // When the move stays within the same list, `sourceCards` and `targetCards`
  // are the same array reference, so it must only be included once.
  return targetListId === sourceListId
    ? [...others, ...targetCards]
    : [...others, ...sourceCards, ...targetCards];
}
