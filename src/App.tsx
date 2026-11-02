import { createHashRouter, RouterProvider } from 'react-router';
import { routes } from './routes';

// Hash routing: the app runs locally with no server, so a built copy must work
// without history-API rewrites.
const router = createHashRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
