import { describe, it, expect } from 'vitest';
import { duplicateLayerName } from './layers';

describe('duplicateLayerName', () => {
  it('基础名未被占用时直接加「副本」', () => {
    expect(duplicateLayerName('背景', ['图层 1', '图层 2'])).toBe('背景 副本');
  });

  it('基础名已占用时追加序号', () => {
    expect(duplicateLayerName('背景', ['背景 副本'])).toBe('背景 副本 2');
  });

  it('连续占用时找到最小空闲序号', () => {
    expect(duplicateLayerName('背景', ['背景 副本', '背景 副本 2', '背景 副本 3'])).toBe(
      '背景 副本 4'
    );
  });

  it('空列表直接使用基础名', () => {
    expect(duplicateLayerName('图层A', [])).toBe('图层A 副本');
  });
});
