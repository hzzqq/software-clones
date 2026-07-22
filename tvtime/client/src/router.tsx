import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import ShowsPage from './pages/ShowsPage';
import ShowDetailPage from './pages/ShowDetailPage';

/**
 * TV Time routes: show list at `/`; detail at `/shows/:id`.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <ShowsPage /> },
      { path: 'shows/:id', element: <ShowDetailPage /> },
    ],
  },
]);
