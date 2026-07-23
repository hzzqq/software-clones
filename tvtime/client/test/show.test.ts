import { describe, it, expect } from 'vitest';
import { formatEpisodeCode } from '../src/utils/show';

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
