import { createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { ThemeMode } from './components/SettingsHelp/types';

/**
 * Shared MUI theme factory. Centralizes brand color, typography, shape and
 * component defaults so the app shares a consistent visual language with the
 * other clones. 主题由 SettingsHelpProvider 依据用户设置调用本工厂，
 * 从而支持亮色 / 暗色 / 跟随系统三态切换。
 *
 * @param mode 用户选择的主题模式，'system' 会按系统偏好解析。
 */
export function createAppTheme(mode: ThemeMode = 'light'): Theme {
  const resolved: 'light' | 'dark' =
    mode === 'system'
      ? typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : mode;

  return createTheme({
    palette: {
      mode: resolved,
      primary: {
        main: '#3b82f6',
        dark: '#1d4ed8',
        light: '#60a5fa',
      },
      secondary: {
        main: '#8b5cf6',
      },
      background:
        resolved === 'dark'
          ? { default: '#0f1419', paper: '#161b22' }
          : { default: '#f5f7fa', paper: '#ffffff' },
    },
    shape: {
      borderRadius: 10,
    },
    typography: {
      fontFamily:
        '"Inter", "Roboto", "Helvetica", "Arial", "PingFang SC", "Microsoft YaHei", sans-serif',
      h6: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
    },
  });
}
