import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import ArticlesPage from './pages/ArticlesPage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import FeedsPage from './pages/FeedsPage';

/**
 * RSSReader routes:
 *  - `/`            文章列表（订阅源 / 未读 / 关键词筛选）
 *  - `/articles/:id` 全文阅读视图（自动标已读）
 *  - `/feeds`       订阅源管理（添加 / 删除 / 手动刷新）
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <ArticlesPage /> },
      { path: 'articles/:id', element: <ArticleDetailPage /> },
      { path: 'feeds', element: <FeedsPage /> },
    ],
  },
]);
