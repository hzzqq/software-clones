import { describe, it, expect } from 'vitest';
import { duplicateLayerName, applyLayerMeta } from './layers';

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

describe('applyLayerMeta', () => {
  const mk = () => ({
    name: '图层 1',
    opacity: 1,
    visible: true,
  });

  it('按索引还原名称 / 不透明度 / 可见性', () => {
    const layers = [mk(), mk()];
    applyLayerMeta(layers, [
      { name: '底图', opacity: 0.5, visible: false },
      { name: '文字', opacity: 0.8, visible: true },
    ]);
    expect(layers[0]).toEqual({ name: '底图', opacity: 0.5, visible: false });
    expect(layers[1]).toEqual({ name: '文字', opacity: 0.8, visible: true });
  });

  it('不透明度被夹到 [0,1]，非法值退化为 0', () => {
    const layers = [mk()];
    applyLayerMeta(layers, [{ name: 'x', opacity: 2, visible: true }]);
    expect(layers[0].opacity).toBe(1);
    applyLayerMeta(layers, [{ name: 'x', opacity: -1, visible: true }]);
    expect(layers[0].opacity).toBe(0);
    applyLayerMeta(layers, [{ name: 'x', opacity: Number.NaN, visible: true }]);
    expect(layers[0].opacity).toBe(0);
  });

  it('meta 多于图层时只覆盖现有图层，不越界', () => {
    const layers = [mk()];
    applyLayerMeta(layers, [
      { name: 'a', opacity: 0.3, visible: false },
      { name: 'b', opacity: 0.7, visible: true },
    ]);
    expect(layers).toHaveLength(1);
    expect(layers[0].name).toBe('a');
  });

  it('meta 少于图层时其余图层元数据保持不变', () => {
    const layers = [mk(), mk()];
    applyLayerMeta(layers, [{ name: '仅改第一层', opacity: 0.2, visible: false }]);
    expect(layers[0].name).toBe('仅改第一层');
    expect(layers[1]).toEqual(mk());
  });
});
