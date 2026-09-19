/**
 * 共享「使用说明 + 设置面板」模块的常量定义。
 *
 * 存储键、自定义事件名、body dataset 标记与 CSS 变量名集中在此，
 * 避免各处硬编码字符串导致漂移。
 */

/** localStorage 键前缀。 */
export const STORAGE_KEY_PREFIX = 'app-settings:';

/** 根据 appId 生成该 App 的 localStorage 键。 */
export const storageKey = (appId: string): string => `${STORAGE_KEY_PREFIX}${appId}`;

/** 当前设置结构版本号。 */
export const SETTINGS_VERSION = 1;

/** 模块对外广播的自定义事件名。 */
export const APP_EVENTS = {
  MODAL: 'app:modal',
  FULLSCREEN_CHANGE: 'app:fullscreenchange',
  SETTINGS_CHANGE: 'app:settingschange',
  OPEN_SETTINGS: 'app:open-settings',
  OPEN_HELP: 'app:open-help',
} as const;

/**
 * 写入 `document.body.dataset` 的标记键（驼峰形式）。
 * 对应的 HTML 属性分别为 data-app-modal-open / data-app-fullscreen /
 * data-app-reduce-motion。
 */
export const BODY_FLAGS = {
  MODAL_OPEN: 'appModalOpen',
  FULLSCREEN: 'appFullscreen',
  REDUCE_MOTION: 'appReduceMotion',
} as const;

/** 写入 `document.documentElement` 的 CSS 自定义属性名。 */
export const CSS_VARS = {
  FONT_SCALE: '--app-font-scale',
  BASE_FONT_PX: '--app-base-font',
} as const;

/** 字号缩放允许的最小值。 */
export const FONT_SCALE_MIN = 0.85;
/** 字号缩放允许的最大值。 */
export const FONT_SCALE_MAX = 1.3;
/** 字号缩放步长。 */
export const FONT_SCALE_STEP = 0.05;
/** 字号缩放默认值。 */
export const FONT_SCALE_DEFAULT = 1;
/** 根字号基准（px）。 */
export const BASE_FONT_PX = 16;

/**
 * 全屏切换后补发 window resize 事件的延迟（毫秒）。
 * 供 react-grid-layout 的 WidthProvider 等依赖 resize 的组件重新测量。
 */
export const RESIZE_BROADCAST_DELAYS = [0, 150] as const;
