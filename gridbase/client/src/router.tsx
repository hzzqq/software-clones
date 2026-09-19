import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import TablesPage from './pages/TablesPage';
import TableDetailPage from './pages/TableDetailPage';

/**
 * gridbase routes: table list at index, grid editor at /tables/:id.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <TablesPage /> },
      { path: 'tables/:id', element: <TableDetailPage /> },
    ],
  },
]);
