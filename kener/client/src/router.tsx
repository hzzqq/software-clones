import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import DashboardPage from './pages/DashboardPage';
import ServiceFormPage from './pages/ServiceFormPage';

/**
 * Kener status page routes: dashboard lists services; the form handles both
 * create (`/services/new`) and edit (`/services/:id/edit`).
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'services/new', element: <ServiceFormPage /> },
      { path: 'services/:id/edit', element: <ServiceFormPage /> },
    ],
  },
]);
