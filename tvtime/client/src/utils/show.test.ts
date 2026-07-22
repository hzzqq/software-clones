import { describe, it, expect } from 'vitest';
import { progressPercent, nextUnwatched, isComplete } from './show';
import type { Episode } from '../types';

function ep(index: number, watched: boolean): Episode {
  return {
    id: index,
    showId: 1,
    index,
    watched,
    watchedAt: null,
    createdAt: '',
    updatedAt: '',
  };
}

describe('progressPercent', () => {
  it('正常比例', () => {
    expect(progressPercent(5, 10)).toBe(50);
  });
  it('总数为 0 时返回 0', () => {
    expect(progressPercent(0, 0)).toBe(0);
  });
  it('已看超过总数时夹回 100', () => {
    expect(progressPercent(12, 10)).toBe(100);
  });
  it('负数已看夹回 0', () => {
    expect(progressPercent(-3, 10)).toBe(0);
  });
});

describe('nextUnwatched', () => {
  it('返回第一个未看', () => {
    const eps = [ep(1, true), ep(2, false), ep(3, false)];
    expect(nextUnwatched(eps)).toBe(2);
  });
  it('乱序时仍返回最小的未看序号', () => {
    const eps = [ep(3, false), ep(1, true), ep(2, true)];
    expect(nextUnwatched(eps)).toBe(3);
  });
  it('全部看完返回 null', () => {
    expect(nextUnwatched([ep(1, true), ep(2, true)])).toBeNull();
  });
  it('空列表返回 null', () => {
    expect(nextUnwatched([])).toBeNull();
  });
});

describe('isComplete', () => {
  it('完结', () => {
    expect(isComplete(10, 10)).toBe(true);
  });
  it('未完结', () => {
    expect(isComplete(9, 10)).toBe(false);
  });
});
