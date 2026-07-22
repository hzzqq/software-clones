import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import EditorPage from './pages/EditorPage';

/**
 * Photopea 克隆路由：编辑器作为首页 `/`，占满全屏。
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <EditorPage /> },
    ],
  },
]);
