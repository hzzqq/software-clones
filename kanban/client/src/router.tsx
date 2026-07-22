import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import BoardsListPage from './pages/BoardsListPage';
import BoardPage from './pages/BoardPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/boards" replace /> },
      { path: 'boards', element: <BoardsListPage /> },
      { path: 'boards/:id', element: <BoardPage /> },
    ],
  },
]);
