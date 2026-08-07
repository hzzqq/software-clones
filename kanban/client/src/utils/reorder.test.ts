import { describe, it, expect } from 'vitest';
import { reorderCards } from './reorder';
import { Card } from '../types';

function makeCard(id: number, listId: number, position: number): Card {
  return {
    id,
    listId,
    title: `c${id}`,
    description: '',
    dueDate: null,
    priority: 0,
    completed: 0,
    assignee: '',
    position,
    createdAt: '',
    updatedAt: '',
    tagIds: [],
    checklist: [],
    commentCount: 0,
  };
}

describe('reorderCards', () => {
  const cards = [makeCard(1, 10, 0), makeCard(2, 10, 1), makeCard(3, 10, 2)];

  it('returns original when active id is unknown', () => {
    expect(reorderCards(cards, 99, 'list-10')).toEqual(cards);
  });

  it('moves a card to the end of an empty list', () => {
    const out = reorderCards(cards, 1, 'list-20');
    const moved = out.find((c) => c.id === 1)!;
    expect(moved.listId).toBe(20);
    expect(moved.position).toBe(0);
  });

  it('moves a card before another card in the same list', () => {
    const out = reorderCards(cards, 3, '2');
    const order = out.filter((c) => c.listId === 10).map((c) => c.id);
    expect(order).toEqual([1, 3, 2]);
  });

  it('re-indexes positions contiguously after a within-list move', () => {
    const out = reorderCards(cards, 1, '3');
    const positions = out
      .filter((c) => c.listId === 10)
      .sort((a, b) => a.id - b.id)
      .map((c) => c.position);
    expect(positions).toEqual([0, 1, 2]);
  });

  it('returns a new array (does not mutate input)', () => {
    const snapshot = JSON.stringify(cards);
    reorderCards(cards, 1, 'list-20');
    expect(JSON.stringify(cards)).toBe(snapshot);
  });

  it('drops onto an empty column places card at index 0', () => {
    const out = reorderCards([makeCard(5, 30, 0)], 5, 'list-40');
    expect(out[0].listId).toBe(40);
    expect(out[0].position).toBe(0);
  });
});
