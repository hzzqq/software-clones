import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import ApiClientPage from './pages/ApiClientPage';

/**
 * Web API client routes — single full-screen workspace at `/`.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [{ index: true, element: <ApiClientPage /> }],
  },
]);
