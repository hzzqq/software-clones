import { Widget, WidgetDTO, WidgetLayout, WidgetConfig } from '../types';

export const DEFAULT_LAYOUT: WidgetLayout = { x: 0, y: 0, w: 4, h: 3 };

/**
 * Parse a JSON string, falling back to a safe default when the input is
 * empty or malformed. Prevents a corrupt `layoutJson`/`configJson` from the
 * API from crashing the entire dashboard render.
 */
export function safeParse<T>(json: string, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/** Parse a raw API widget (JSON-string fields) into the client `Widget`. */
export function parseDto(d: WidgetDTO): Widget {
  return {
    id: d.id,
    type: d.type as Widget['type'],
    title: d.title,
    layout: safeParse<WidgetLayout>(d.layoutJson, DEFAULT_LAYOUT),
    config: safeParse<WidgetConfig>(d.configJson, {} as WidgetConfig),
    enabled: d.enabled === 1,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

/** Coerce a partial layout into a valid WidgetLayout, clamping to sane bounds. */
export function normalizeLayout(l: Partial<WidgetLayout> | undefined): WidgetLayout {
  const layout = l ?? DEFAULT_LAYOUT;
  const clamp = (n: number, min: number, max: number, dflt: number): number =>
    Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : dflt;
  const x: number = layout.x ?? 0;
  const y: number = layout.y ?? 0;
  const w: number = layout.w ?? 4;
  const h: number = layout.h ?? 3;
  return {
    x: clamp(x, 0, 11, 0),
    y: clamp(y, 0, 999, 0),
    w: clamp(w, 2, 12, 4),
    h: clamp(h, 2, 24, 3),
  };
}
