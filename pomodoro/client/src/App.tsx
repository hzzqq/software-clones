import { RouterProvider } from 'react-router-dom';
import { router } from './router';

/**
 * Root application component. Delegates routing to the react-router
 * configuration defined in `router.tsx`.
 */
export default function App(): JSX.Element {
  return <RouterProvider router={router} />;
}
