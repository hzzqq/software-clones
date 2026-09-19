import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import TasksPage from './pages/TasksPage';

/**
 * 清单任务路由表：单一主页承载项目管理与任务列表。
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <TasksPage />,
      },
    ],
  },
]);
