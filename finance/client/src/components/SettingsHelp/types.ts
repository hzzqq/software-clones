/**
 * 共享「使用说明 + 设置面板」模块的类型契约。
 *
 * 该文件是 12 个 App 共用的单一真源（_shared/settings-help/types.ts），
 * 通过 scripts/sync-settings-help.mjs 同步到各 App 的
 * `client/src/components/SettingsHelp/types.ts`。
 */

/** 用户可选的主题模式，'system' 表示跟随操作系统。 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 'system' 解析之后真正生效的主题模式。 */
export type ResolvedThemeMode = 'light' | 'dark';

/** 持久化到 localStorage 的应用级设置。 */
export interface AppSettings {
  /** 结构版本号，用于将来做迁移。 */
  version: 1;
  /** 主题模式，默认 'light'。 */
  themeMode: ThemeMode;
  /** 字号缩放系数，区间 [0.85, 1.30]，步长 0.05，默认 1。 */
  fontScale: number;
  /** 是否减少动效，默认 false。 */
  reduceMotion: boolean;
  /** 各 App 可自行扩展的附加设置。 */
  extras: Record<string, unknown>;
}

/** 全部设置项的出厂默认值。 */
export const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  themeMode: 'light',
  fontScale: 1,
  reduceMotion: false,
  extras: {},
};

/** 帮助弹窗中的一个功能分组。 */
export interface HelpSection {
  title: string;
  items: string[];
}

/** 帮助弹窗中的一条快捷键说明。 */
export interface HelpShortcut {
  key: string;
  desc: string;
}

/** 帮助弹窗中的一条常见问题。 */
export interface HelpFaq {
  q: string;
  a: string;
}

/** 单个 App 的帮助内容，由各 App 的 help/helpContent.ts 提供。 */
export interface HelpContent {
  appName: string;
  tagline: string;
  sections: HelpSection[];
  shortcuts?: HelpShortcut[];
  faq?: HelpFaq[];
}
