import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import RoomsPage from './pages/RoomsPage';
import RoomPage from './pages/RoomPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/rooms" replace /> },
      { path: 'rooms', element: <RoomsPage /> },
      { path: 'rooms/:id', element: <RoomPage /> },
    ],
  },
]);
