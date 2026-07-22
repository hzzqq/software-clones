import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * Application route table. The template ships with a single placeholder route
 * under the main layout; apps replace this with their real routes.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <div style={{ padding: 24 }}>Welcome to the template.</div>,
      },
    ],
  },
]);
