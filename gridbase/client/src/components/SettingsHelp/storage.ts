/**
 * 设置项的 localStorage 读写层。
 *
 * 设计原则：**任何异常都不得导致白屏**。读取失败、JSON 损坏、字段缺失或
 * 越界，一律回落到 DEFAULT_SETTINGS 或被钳制到合法区间。
 */
import type { AppSettings, ThemeMode } from './types';
import { DEFAULT_SETTINGS } from './types';
import {
  storageKey,
  SETTINGS_VERSION,
  FONT_SCALE_MIN,
  FONT_SCALE_MAX,
  FONT_SCALE_DEFAULT,
} from './constants';

/** 合法的主题模式取值。 */
const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

/** 判断任意值是否为合法主题模式。 */
function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);
}

/** 将任意值钳制为 [FONT_SCALE_MIN, FONT_SCALE_MAX] 区间内、保留两位小数的数字。 */
function clampFontScale(value: unknown): number {
  const raw: number =
    typeof value === 'number' && Number.isFinite(value) ? value : FONT_SCALE_DEFAULT;
  const clamped: number = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, raw));
  return Math.round(clamped * 100) / 100;
}

/**
 * 把来源不可信的对象规整成一个结构完整、取值合法的 AppSettings。
 * 缺失字段用默认值补齐，非法字段被修正。
 */
export function sanitize(raw: unknown): AppSettings {
  if (raw === null || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS, extras: {} };
  }
  const source = raw as Partial<AppSettings>;
  const extras: Record<string, unknown> =
    source.extras !== null && typeof source.extras === 'object'
      ? { ...(source.extras as Record<string, unknown>) }
      : {};
  return {
    version: SETTINGS_VERSION,
    themeMode: isThemeMode(source.themeMode) ? source.themeMode : DEFAULT_SETTINGS.themeMode,
    fontScale: clampFontScale(source.fontScale),
    reduceMotion:
      typeof source.reduceMotion === 'boolean'
        ? source.reduceMotion
        : DEFAULT_SETTINGS.reduceMotion,
    extras,
  };
}

/** 读取某个 App 的设置；任何异常都回落到默认值。 */
export function load(appId: string): AppSettings {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_SETTINGS, extras: {} };
    }
    const text: string | null = window.localStorage.getItem(storageKey(appId));
    if (!text) {
      return { ...DEFAULT_SETTINGS, extras: {} };
    }
    return sanitize(JSON.parse(text));
  } catch (error) {
    console.warn('[settings-help] 读取设置失败，已回落默认值', error);
    return { ...DEFAULT_SETTINGS, extras: {} };
  }
}

/** 保存某个 App 的设置；写入失败仅告警，不抛错。 */
export function save(appId: string, settings: AppSettings): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(storageKey(appId), JSON.stringify(sanitize(settings)));
  } catch (error) {
    console.warn('[settings-help] 保存设置失败', error);
  }
}

/** 清除某个 App 的设置；失败仅告警，不抛错。 */
export function clear(appId: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.removeItem(storageKey(appId));
  } catch (error) {
    console.warn('[settings-help] 清除设置失败', error);
  }
}
