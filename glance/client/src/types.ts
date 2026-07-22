/** Shared domain types for the Glance dashboard app. */

export type WidgetType = 'rss' | 'weather' | 'bookmarks' | 'status' | 'clock';

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RssConfig {
  url: string;
  maxItems?: number;
}
export interface WeatherConfig {
  lat: number;
  lon: number;
  label?: string;
}
export interface BookmarkItem {
  name: string;
  url: string;
  icon?: string;
}
export interface BookmarksConfig {
  items: BookmarkItem[];
}
export interface StatusItem {
  name: string;
  url: string;
  expectedStatus?: number;
}
export interface StatusConfig {
  items: StatusItem[];
}
export interface ClockConfig {
  timezone?: string;
  format?: string;
}
export type WidgetConfig =
  | RssConfig
  | WeatherConfig
  | BookmarksConfig
  | StatusConfig
  | ClockConfig;

/** Parsed widget as used by the client (layout/config are objects). */
export interface Widget {
  id: number;
  type: WidgetType;
  title: string;
  layout: WidgetLayout;
  config: WidgetConfig;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Raw widget as returned by the API (layout/config are JSON strings). */
export interface WidgetDTO {
  id: number;
  type: string;
  title: string;
  layoutJson: string;
  configJson: string;
  enabled: number;
  createdAt: string;
  updatedAt: string;
}
