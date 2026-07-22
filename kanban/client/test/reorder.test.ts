import { describe, it, expect } from 'vitest';
import { reorderCards } from '../src/utils/reorder';
import { Card } from '../src/types';

function makeCard(id: number, listId: number, position: number): Card {
  return {
    id,
    listId,
    title: `card-${id}`,
    description: '',
    dueDate: null,
    priority: 0,
    completed: 0,
    position,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    tagIds: [],
  };
}

describe('reorderCards', () => {
  it('reorders within the same list (drop onto another card)', () => {
    const cards = [makeCard(1, 1, 0), makeCard(2, 1, 1), makeCard(3, 1, 2)];
    // drag card 1 onto card 3
    const result = reorderCards(cards, 1, '3');

    const byId = Object.fromEntries(result.map((c) => [c.id, c]));
    expect(byId[1].position).toBe(1);
    expect(byId[2].position).toBe(0);
    expect(byId[3].position).toBe(2);
    // order in the returned array reflects new positions
    expect(result.map((c) => c.id)).toEqual([2, 1, 3]);
  });

  it('moves a card to another list', () => {
    const cards = [
      makeCard(1, 1, 0),
      makeCard(2, 1, 1),
      makeCard(3, 2, 0),
      makeCard(4, 2, 1),
    ];
    // drag card 1 onto card 4 (list 2)
    const result = reorderCards(cards, 1, '4');

    const byId = Object.fromEntries(result.map((c) => [c.id, c]));
    expect(byId[1].listId).toBe(2);
    expect(byId[1].position).toBe(1);
    expect(byId[4].position).toBe(2);
    // source list keeps remaining card reindexed from 0
    expect(byId[2].listId).toBe(1);
    expect(byId[2].position).toBe(0);
    expect(byId[3].position).toBe(0);
  });

  it('moves a card to an empty list via list-<id> droppable', () => {
    const cards = [makeCard(1, 1, 0), makeCard(2, 1, 1)];
    const result = reorderCards(cards, 2, 'list-2');

    const byId = Object.fromEntries(result.map((c) => [c.id, c]));
    expect(byId[2].listId).toBe(2);
    expect(byId[2].position).toBe(0);
    expect(byId[1].listId).toBe(1);
    expect(byId[1].position).toBe(0);
  });

  it('returns the same array unchanged when activeId is unknown', () => {
    const cards = [makeCard(1, 1, 0), makeCard(2, 1, 1)];
    const result = reorderCards(cards, 999, '1');
    expect(result).toBe(cards);
  });

  it('returns the same array unchanged when drop target card is unknown', () => {
    const cards = [makeCard(1, 1, 0), makeCard(2, 1, 1)];
    const result = reorderCards(cards, 1, '999');
    expect(result).toBe(cards);
  });

  it('does not mutate the input array', () => {
    const cards = [makeCard(1, 1, 0), makeCard(2, 1, 1), makeCard(3, 1, 2)];
    const snapshot = cards.map((c) => ({ ...c }));
    reorderCards(cards, 1, '3');
    expect(cards).toEqual(snapshot);
  });
});
