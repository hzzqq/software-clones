/**
 * 「设置 + 使用说明」模块统一出口。
 *
 * App 侧只需从 './components/SettingsHelp' 导入，不必关心内部文件结构。
 */
export {
  SettingsHelpProvider,
  SettingsHelpContext,
  useSettingsHelp,
} from './SettingsHelpProvider';
export type {
  SettingsHelpContextValue,
  SettingsHelpProviderProps,
} from './SettingsHelpProvider';

export { SettingsHelpLauncher } from './SettingsHelpLauncher';
export { SettingsModal } from './SettingsModal';
export { HelpModal } from './HelpModal';

export { useAppSettings } from './hooks/useAppSettings';
export type { UseAppSettingsResult } from './hooks/useAppSettings';
export { useFullscreen } from './hooks/useFullscreen';
export type { UseFullscreenResult } from './hooks/useFullscreen';
export { useModalBroadcast, useModalPresence } from './hooks/useModalBroadcast';
export type { UseModalBroadcastResult } from './hooks/useModalBroadcast';

export { load, save, clear, sanitize } from './storage';
export {
  STORAGE_KEY_PREFIX,
  storageKey,
  SETTINGS_VERSION,
  APP_EVENTS,
  BODY_FLAGS,
  CSS_VARS,
  FONT_SCALE_MIN,
  FONT_SCALE_MAX,
  FONT_SCALE_STEP,
  FONT_SCALE_DEFAULT,
  BASE_FONT_PX,
  RESIZE_BROADCAST_DELAYS,
} from './constants';

export { DEFAULT_SETTINGS } from './types';
export type {
  ThemeMode,
  ResolvedThemeMode,
  AppSettings,
  HelpContent,
  HelpSection,
  HelpShortcut,
  HelpFaq,
} from './types';
