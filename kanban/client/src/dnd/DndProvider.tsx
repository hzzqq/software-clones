import { ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface DndProviderProps {
  children: ReactNode;
  onDragEnd: (event: DragEndEvent) => void;
  onDragStart?: (event: DragStartEvent) => void;
  overlay?: ReactNode;
}

/**
 * Wraps board content with the @dnd-kit drag-and-drop context. The overlay
 * (a floating clone of the dragged card) is rendered via `DragOverlay`.
 * `verticalListSortingStrategy` is exported so consumers can build sortable
 * groups consistently.
 */
export const VERTICAL_STRATEGY = verticalListSortingStrategy;

export default function DndProvider({
  children,
  onDragEnd,
  onDragStart,
  overlay,
}: DndProviderProps): JSX.Element {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
    >
      {children}
      <DragOverlay>{overlay}</DragOverlay>
    </DndContext>
  );
}
