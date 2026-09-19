import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import FileManagerPage from './pages/FileManagerPage';

/**
 * 路由表：单页文件管理器。
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [{ index: true, element: <FileManagerPage /> }],
  },
]);
