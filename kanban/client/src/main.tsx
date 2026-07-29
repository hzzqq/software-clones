import React from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import App from './App';
import { theme } from './theme';
import './styles/global.css';

/**
 * 全局异步错误兜底：React ErrorBoundary 仅捕获渲染/生命周期错误，
 * 无法捕获事件回调 / 异步(fetch / setTimeout)中未处理的 Promise 拒绝。
 * 统一拦截 unhandledrejection 与 error，给出可见兜底提示，避免白屏 / 静默冻结。
 */
function installGlobalErrorGuard(): void {
  const showBanner = (msg: string): void => {
    let el = document.getElementById('global-error-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'global-error-banner';
      el.setAttribute(
        'style',
        'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:9999;' +
          'background:#b00020;color:#fff;padding:10px 16px;border-radius:8px;' +
          'font:14px system-ui,sans-serif;max-width:90vw;box-shadow:0 2px 8px rgba(0,0,0,.3)'
      );
      document.body.appendChild(el);
    }
    el.textContent = msg;
    window.setTimeout(() => el?.remove(), 6000);
  };
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    console.error('[unhandledrejection]', e.reason);
    showBanner('发生未处理的错误，请稍后重试');
  });
  window.addEventListener('error', (e: ErrorEvent) => {
    console.error('[global-error]', e.message);
    showBanner('发生未处理的错误，请稍后重试');
  });
}

installGlobalErrorGuard();

const rootElement: HTMLElement | null = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

ReactDOM.createRoot(rootElement).render(
  <ErrorBoundary>
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <App />
      </LocalizationProvider>
    </ThemeProvider>
  </React.StrictMode>
  </ErrorBoundary>
);
