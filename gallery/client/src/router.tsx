import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import GalleryPage from './pages/GalleryPage';
import AlbumsPage from './pages/AlbumsPage';

/**
 * 路由表：相册首页（网格/筛选/上传/灯箱）+ 相册集管理。
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <GalleryPage /> },
      { path: 'albums', element: <AlbumsPage /> },
    ],
  },
]);
