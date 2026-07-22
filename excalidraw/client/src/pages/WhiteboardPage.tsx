import { useState } from 'react';
import Whiteboard from '../components/Whiteboard';
import type { CanvasElement } from '../types';

/**
 * Excalidraw 克隆 —— 手绘白板主页面。
 * 持有画布元素的状态，将 elements / setElements 交给 Whiteboard 组件绘制。
 */
export default function WhiteboardPage(): JSX.Element {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  return <Whiteboard elements={elements} setElements={setElements} />;
}
