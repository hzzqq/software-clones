import { ReactNode } from 'react';
import GridLayout, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Widget, WidgetLayout } from '../types';

const ReactGridLayout = WidthProvider(GridLayout);

interface WidgetGridProps {
  widgets: Widget[];
  onLayoutChange: (id: number, layout: WidgetLayout) => void;
  renderItem: (widget: Widget) => ReactNode;
}

/** Drag-and-drop, resizable grid of widgets (react-grid-layout). */
export default function WidgetGrid({
  widgets,
  onLayoutChange,
  renderItem,
}: WidgetGridProps): JSX.Element {
  const layout: Layout[] = widgets.map((w) => ({
    i: String(w.id),
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
    minW: 2,
    minH: 2,
  }));

  return (
    <ReactGridLayout
      className="layout"
      layout={layout}
      cols={12}
      rowHeight={80}
      margin={[16, 16]}
      draggableHandle=".widget-drag-handle"
      onDragStop={(_layout, item) =>
        onLayoutChange(Number(item.i), {
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
        })
      }
      onResizeStop={(_layout, item) =>
        onLayoutChange(Number(item.i), {
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
        })
      }
    >
      {widgets.map((w) => (
        <div key={String(w.id)}>{renderItem(w)}</div>
      ))}
    </ReactGridLayout>
  );
}
