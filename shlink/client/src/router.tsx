import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import LinksPage from './pages/LinksPage';
import LinkDetailPage from './pages/LinkDetailPage';

/**
 * Shlink routes:
 *  - `/`           短链接列表（创建 / 复制 / 删除 / 汇总统计）
 *  - `/links/:id`  单条短链接详情（点击统计）
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <LinksPage /> },
      { path: 'links/:id', element: <LinkDetailPage /> },
    ],
  },
]);
