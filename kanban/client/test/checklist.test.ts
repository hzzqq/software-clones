import { describe, it, expect } from 'vitest';
import {
  checklistProgress,
  checklistSummaryText,
  isChecklistComplete,
  nextChecklistPosition,
} from '../src/utils/checklist';
import type { ChecklistItem } from '../src/types';

function item(id: number, done: number, position = id): ChecklistItem {
  return {
    id,
    cardId: 1,
    text: `step ${id}`,
    done,
    position,
    createdAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('checklistProgress', () => {
  it('returns zeros for empty / nullish input', () => {
    expect(checklistProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
    expect(checklistProgress(undefined)).toEqual({ done: 0, total: 0, percent: 0 });
    expect(checklistProgress(null)).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it('counts done items and rounds the percentage', () => {
    expect(checklistProgress([item(1, 1), item(2, 0)])).toEqual({
      done: 1,
      total: 2,
      percent: 50,
    });
    // 1/3 → 33.33% → 33
    expect(checklistProgress([item(1, 1), item(2, 0), item(3, 0)]).percent).toBe(33);
  });

  it('treats only done === 1 as completed (ignores truthy dirty values)', () => {
    const dirty = [item(1, 2), item(2, 1)];
    expect(checklistProgress(dirty).done).toBe(1);
  });

  it('reports 100 percent when every item is done', () => {
    expect(checklistProgress([item(1, 1), item(2, 1)]).percent).toBe(100);
  });
});

describe('checklistSummaryText', () => {
  it('returns an empty string for an empty checklist', () => {
    expect(checklistSummaryText([])).toBe('');
    expect(checklistSummaryText(undefined)).toBe('');
  });

  it('formats as done/total', () => {
    expect(checklistSummaryText([item(1, 1), item(2, 0), item(3, 1)])).toBe('2/3');
  });
});

describe('isChecklistComplete', () => {
  it('is false for an empty checklist', () => {
    expect(isChecklistComplete([])).toBe(false);
    expect(isChecklistComplete(null)).toBe(false);
  });

  it('is true only when all items are done', () => {
    expect(isChecklistComplete([item(1, 1), item(2, 0)])).toBe(false);
    expect(isChecklistComplete([item(1, 1), item(2, 1)])).toBe(true);
  });
});

describe('nextChecklistPosition', () => {
  it('returns 0 for an empty checklist', () => {
    expect(nextChecklistPosition([])).toBe(0);
    expect(nextChecklistPosition(undefined)).toBe(0);
  });

  it('returns max position + 1', () => {
    expect(nextChecklistPosition([item(1, 0, 0), item(2, 0, 5)])).toBe(6);
  });

  it('ignores non-finite positions', () => {
    const broken = [{ ...item(1, 0), position: Number.NaN }, item(2, 0, 3)];
    expect(nextChecklistPosition(broken)).toBe(4);
  });
});
