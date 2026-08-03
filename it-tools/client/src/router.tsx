import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import ToolPage from './pages/ToolPage';
import FavoritesPage from './pages/FavoritesPage';
import HistoryPage from './pages/HistoryPage';
import { tools } from './tools/registry';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Navigate to={`/tool/${tools[0].key}`} replace /> },
      { path: 'tool/:key', element: <ToolPage /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'history', element: <HistoryPage /> },
      // 设置已统一收敛到右下角悬浮设置面板，旧路由重定向到首页，避免书签 404。
      { path: 'settings', element: <Navigate to="/" replace /> },
    ],
  },
]);
