import { describe, it, expect } from 'vitest';
import { formatEpisodeCode, nextEpisodeLabel, type Episode } from '../src/utils/show';

function mkEp(index: number, watched: boolean, season?: number, number?: number): Episode {
  return { id: index, showId: 1, index, season, number, watched, watchedAt: null, createdAt: '', updatedAt: '' };
}

describe('formatEpisodeCode', () => {
  it('正常季集编号补零为两位数（1,2）→ S01E02', () => {
    expect(formatEpisodeCode(1, 2)).toBe('S01E02');
  });

  it('单数字节集均补零（3,7）→ S03E07', () => {
    expect(formatEpisodeCode(3, 7)).toBe('S03E07');
  });

  it('0 也会补零（0,0）→ S00E00', () => {
    expect(formatEpisodeCode(0, 0)).toBe('S00E00');
  });

  it('两位数季集原样保留（12,24）→ S12E24', () => {
    expect(formatEpisodeCode(12, 24)).toBe('S12E24');
  });
});

describe('nextEpisodeLabel', () => {
  it('未看剧集返回「下一集 SxxExx」（编号取剧集自身 season/number）', () => {
    expect(nextEpisodeLabel(mkEp(4, false), 10)).toBe('下一集 S01E04');
  });

  it('优先使用 season/number 而非 index 拼编号', () => {
    expect(nextEpisodeLabel(mkEp(5, false, 2, 9), 10)).toBe('下一集 S02E09');
  });

  it('ep 为 null（全部看完）返回「已看完」', () => {
    expect(nextEpisodeLabel(null, 10)).toBe('已看完');
  });

  it('总集数为 0 时返回「已看完」', () => {
    expect(nextEpisodeLabel(mkEp(1, false), 0)).toBe('已看完');
  });
});
