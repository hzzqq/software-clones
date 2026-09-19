/**
 * 「设置 + 使用说明」组合根。
 *
 * 方案 A：ThemeProvider 由本组件内部持有，因此各 App 的 main.tsx 不再关心
 * 主题状态，12 份 main.tsx 的改动完全同构。
 *
 * 该组件负责：
 *  - 依据设置解析出的模式构建 MUI 主题（createAppTheme 工厂）；
 *  - 注入 CssBaseline 与「减少动效」全局样式；
 *  - 提供 context（设置、全屏、开关弹窗等）；
 *  - 渲染右下角悬浮入口与两个弹窗；
 *  - 挂载 F1 / Ctrl+, 全局快捷键与 open-settings / open-help 事件监听。
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { Alert, CssBaseline, GlobalStyles, Snackbar } from '@mui/material';
import { createAppTheme } from '../../theme';
import type { AppSettings, HelpContent, ResolvedThemeMode } from './types';
import { APP_EVENTS } from './constants';
import { useAppSettings } from './hooks/useAppSettings';
import { useFullscreen } from './hooks/useFullscreen';
import SettingsHelpLauncher from './SettingsHelpLauncher';
import SettingsModal from './SettingsModal';
import HelpModal from './HelpModal';

/** context 对外暴露的能力集合。 */
export interface SettingsHelpContextValue {
  /** 当前设置。 */
  settings: AppSettings;
  /** 'system' 解析后的实际主题模式。 */
  resolvedMode: ResolvedThemeMode;
  /** 修改单个设置项。 */
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  /** 恢复默认设置。 */
  reset: () => void;
  /** 当前是否全屏。 */
  isFullscreen: boolean;
  /** 切换全屏。 */
  toggleFullscreen: () => Promise<boolean>;
  /** 打开设置面板。 */
  openSettings: () => void;
  /** 打开使用说明。 */
  openHelp: () => void;
  /** 关闭全部弹窗。 */
  closeAll: () => void;
  /** 设置面板是否打开。 */
  settingsOpen: boolean;
  /** 使用说明是否打开。 */
  helpOpen: boolean;
  /** 关闭设置面板。 */
  closeSettings: () => void;
  /** 关闭使用说明。 */
  closeHelp: () => void;
  /** 当前 App 标识。 */
  appId: string;
  /** 当前 App 中文名。 */
  appName: string;
  /** 当前 App 的帮助内容。 */
  helpContent: HelpContent;
}

/** 共享 context；未包裹 Provider 时为 null。 */
export const SettingsHelpContext = createContext<SettingsHelpContextValue | null>(null);

/**
 * 读取「设置 + 使用说明」context。
 *
 * 使用函数声明（而非箭头函数常量），保证在与本模块存在循环引用的子组件中
 * 也能通过提升拿到绑定。
 *
 * @throws 当组件未被 SettingsHelpProvider 包裹时抛出，便于开发期定位。
 */
export function useSettingsHelp(): SettingsHelpContextValue {
  const ctx = useContext(SettingsHelpContext);
  if (!ctx) {
    throw new Error('useSettingsHelp 必须在 <SettingsHelpProvider> 内部使用');
  }
  return ctx;
}

/** 「减少动效」开启时生效的全局样式。 */
const REDUCE_MOTION_STYLES = {
  'body[data-app-reduce-motion="1"] *, body[data-app-reduce-motion="1"] *::before, body[data-app-reduce-motion="1"] *::after':
    {
      animationDuration: '0.001ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.001ms !important',
      scrollBehavior: 'auto !important',
    },
} as const;

/** SettingsHelpProvider 的入参。 */
export interface SettingsHelpProviderProps {
  /** App 稳定标识，决定 localStorage 键。 */
  appId: string;
  /** App 中文名，用于弹窗标题。 */
  appName: string;
  /** 该 App 的帮助内容。 */
  helpContent: HelpContent;
  /** 被包裹的应用主体。 */
  children: ReactNode;
}

/** 判断事件目标是否为可输入元素（此时不响应全局快捷键）。 */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) {
    return false;
  }
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true;
}

/** 组合根组件。 */
export function SettingsHelpProvider(props: SettingsHelpProviderProps): JSX.Element {
  const { appId, appName, helpContent, children } = props;
  const { settings, resolvedMode, update, reset } = useAppSettings(appId);
  const { isFullscreen, toggle, notice, clearNotice } = useFullscreen();
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  const openSettings = useCallback((): void => {
    setSettingsOpen(true);
  }, []);
  const openHelp = useCallback((): void => {
    setHelpOpen(true);
  }, []);
  const closeSettings = useCallback((): void => {
    setSettingsOpen(false);
  }, []);
  const closeHelp = useCallback((): void => {
    setHelpOpen(false);
  }, []);
  const closeAll = useCallback((): void => {
    setSettingsOpen(false);
    setHelpOpen(false);
  }, []);

  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

  // 全局快捷键：F1 打开使用说明，Ctrl/Cmd + , 打开设置。
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target)) {
        return;
      }
      if (event.key === 'F1') {
        event.preventDefault();
        openHelp();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === ',') {
        event.preventDefault();
        openSettings();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [openHelp, openSettings]);

  // 允许 App 内任意位置通过派发事件打开面板（无需拿到 context）。
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const onOpenSettings = (): void => openSettings();
    const onOpenHelp = (): void => openHelp();
    window.addEventListener(APP_EVENTS.OPEN_SETTINGS, onOpenSettings);
    window.addEventListener(APP_EVENTS.OPEN_HELP, onOpenHelp);
    return () => {
      window.removeEventListener(APP_EVENTS.OPEN_SETTINGS, onOpenSettings);
      window.removeEventListener(APP_EVENTS.OPEN_HELP, onOpenHelp);
    };
  }, [openHelp, openSettings]);

  const ctx = useMemo<SettingsHelpContextValue>(
    () => ({
      settings,
      resolvedMode,
      update,
      reset,
      isFullscreen,
      toggleFullscreen: toggle,
      openSettings,
      openHelp,
      closeAll,
      settingsOpen,
      helpOpen,
      closeSettings,
      closeHelp,
      appId,
      appName,
      helpContent,
    }),
    [
      settings,
      resolvedMode,
      update,
      reset,
      isFullscreen,
      toggle,
      openSettings,
      openHelp,
      closeAll,
      settingsOpen,
      helpOpen,
      closeSettings,
      closeHelp,
      appId,
      appName,
      helpContent,
    ]
  );

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={REDUCE_MOTION_STYLES} />
      <SettingsHelpContext.Provider value={ctx}>
        {children}
        <SettingsHelpLauncher />
        <SettingsModal />
        <HelpModal />
        <Snackbar
          open={notice.length > 0}
          autoHideDuration={3000}
          onClose={clearNotice}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="warning" variant="filled" onClose={clearNotice}>
            {notice}
          </Alert>
        </Snackbar>
      </SettingsHelpContext.Provider>
    </MuiThemeProvider>
  );
}

export default SettingsHelpProvider;
