import React from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import App from './App';
import { theme } from './theme';
import './styles/global.css';

/**
 * Application entry point. Wraps the root component with the MUI theme and
 * a CSS baseline reset, then mounts it to the DOM.
 */
const rootElement: HTMLElement | null = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

ReactDOM.createRoot(rootElement).render(
  <ErrorBoundary>
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
  </ErrorBoundary>
);
