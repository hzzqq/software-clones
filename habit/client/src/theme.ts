import { createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { ThemeMode } from './components/SettingsHelp/types';

/**
 * 共享 MUI 主题工厂。由 SettingsHelpProvider 依据用户设置调用本工厂，
 * 支持亮色 / 暗色 / 跟随系统三态切换。
 *
 * Habit 品牌色采用活力橙绿（成长感）+ 暖色点缀。
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
        main: '#f97316',
        dark: '#c2410c',
        light: '#fb923c',
      },
      secondary: {
        main: '#22c55e',
      },
      background:
        resolved === 'dark'
          ? { default: '#0f1419', paper: '#161b22' }
          : { default: '#f1f5f9', paper: '#ffffff' },
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
