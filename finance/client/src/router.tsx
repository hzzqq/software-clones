import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import Market from './pages/Market';

/**
 * Application route table for the Finance terminal clone.
 * The index route renders the market dashboard.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Market />,
      },
    ],
  },
]);
