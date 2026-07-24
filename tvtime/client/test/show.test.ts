import { describe, it, expect } from 'vitest';
import { formatEpisodeCode, nextEpisodeLabel } from '../src/utils/show';

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
  it('已看少于总数时返回「下一集 第 N 集」（N = watched + 1）', () => {
    expect(nextEpisodeLabel(3, 10)).toBe('下一集 第 4 集');
  });

  it('已看达到或超过总数时返回「已看完」', () => {
    expect(nextEpisodeLabel(10, 10)).toBe('已看完');
    expect(nextEpisodeLabel(12, 10)).toBe('已看完');
  });

  it('总集数为 0 时返回「已看完」', () => {
    expect(nextEpisodeLabel(0, 0)).toBe('已看完');
  });
});
