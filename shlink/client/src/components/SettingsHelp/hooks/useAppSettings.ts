/**
 * 应用设置状态钩子：持有 AppSettings，负责持久化与 DOM 副作用。
 *
 * 副作用分工：
 *  - 字号缩放写到 documentElement.style.fontSize 与 --app-font-scale
 *    （**不** 修改 theme.typography.htmlFontSize，避免污染 MUI 主题）；
 *  - 减少动效写到 body.dataset.appReduceMotion；
 *  - 每次变更广播 APP_EVENTS.SETTINGS_CHANGE。
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { AppSettings, ResolvedThemeMode } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { APP_EVENTS, BODY_FLAGS, CSS_VARS, BASE_FONT_PX } from '../constants';
import { load, save, clear } from '../storage';

/** 系统深色偏好的媒体查询串。 */
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** 安全读取系统是否偏好深色；环境不支持时返回 false。 */
function prefersDark(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(DARK_QUERY).matches
    );
  } catch {
    return false;
  }
}

/** useAppSettings 的返回结构。 */
export interface UseAppSettingsResult {
  /** 当前设置。 */
  settings: AppSettings;
  /** 'system' 已解析后的实际主题模式。 */
  resolvedMode: ResolvedThemeMode;
  /** 修改单个设置项并立即持久化。 */
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  /** 清空存储并恢复默认设置。 */
  reset: () => void;
}

/**
 * 管理某个 App 的设置。
 *
 * @param appId 该 App 的稳定标识，用作 localStorage 键的一部分。
 */
export function useAppSettings(appId: string): UseAppSettingsResult {
  const [settings, setSettings] = useState<AppSettings>(() => load(appId));
  const [systemDark, setSystemDark] = useState<boolean>(() => prefersDark());

  // appId 变化时重新载入（正常情况下每个 App 固定，仅为健壮性保留）。
  useEffect(() => {
    setSettings(load(appId));
  }, [appId]);

  // 跟随系统：监听 prefers-color-scheme 变化。
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia(DARK_QUERY);
    } catch {
      return undefined;
    }
    const onChange = (event: MediaQueryListEvent): void => {
      setSystemDark(event.matches);
    };
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  const resolvedMode: ResolvedThemeMode = useMemo(() => {
    if (settings.themeMode === 'system') {
      return systemDark ? 'dark' : 'light';
    }
    return settings.themeMode;
  }, [settings.themeMode, systemDark]);

  const update = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]): void => {
      setSettings((prev) => {
        const next: AppSettings = { ...prev, [key]: value };
        save(appId, next);
        return next;
      });
    },
    [appId]
  );

  const reset = useCallback((): void => {
    clear(appId);
    setSettings({ ...DEFAULT_SETTINGS, extras: {} });
  }, [appId]);

  // 字号缩放：改根字号（rem 基准），Tailwind 与 MUI 的 rem 尺寸随之缩放。
  useLayoutEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const root: HTMLElement = document.documentElement;
    root.style.fontSize = `${BASE_FONT_PX * settings.fontScale}px`;
    root.style.setProperty(CSS_VARS.FONT_SCALE, String(settings.fontScale));
    root.style.setProperty(CSS_VARS.BASE_FONT_PX, `${BASE_FONT_PX}px`);
  }, [settings.fontScale]);

  // 减少动效：打标记，并注入全局样式真正禁用动画/过渡（否则开关点了无效）。
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const STYLE_ID = 'app-reduced-motion-style';
    if (settings.reduceMotion) {
      document.body.dataset[BODY_FLAGS.REDUCE_MOTION] = '1';
      if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
          'body[appReduceMotion="1"] *,',
          'body[appReduceMotion="1"] *::before,',
          'body[appReduceMotion="1"] *::after,',
          '@media (prefers-reduced-motion: reduce) {',
          '  *, *::before, *::after {',
          '    animation-duration: 0.001ms !important;',
          '    animation-iteration-count: 1 !important;',
          '    transition-duration: 0.001ms !important;',
          '    scroll-behavior: auto !important;',
          '  }',
          '}',
        ].join('\n');
        document.head.appendChild(style);
      }
    } else {
      delete document.body.dataset[BODY_FLAGS.REDUCE_MOTION];
      const existing = document.getElementById(STYLE_ID);
      if (existing) {
        existing.remove();
      }
    }
  }, [settings.reduceMotion]);

  // 广播设置变更，方便 App 内其他模块按需响应。
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.dispatchEvent(
        new CustomEvent(APP_EVENTS.SETTINGS_CHANGE, { detail: { appId, settings } })
      );
    } catch (error) {
      console.warn('[settings-help] 广播设置变更失败', error);
    }
  }, [appId, settings]);

  return { settings, resolvedMode, update, reset };
}
