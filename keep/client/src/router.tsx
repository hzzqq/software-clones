import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import NotesPage from './pages/NotesPage';

/**
 * 极简便签路由表：单一主页承载便签管理。
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <NotesPage />,
      },
    ],
  },
]);
