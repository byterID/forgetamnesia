import { lazy, Suspense } from 'react';
import { BrowserRouter } from 'react-router';
import { AppRoutes } from '@/routes';

// Not needed for first paint: keeps sonner out of the initial bundle.
const Toaster = lazy(() => import('@/ui/toaster').then((m) => ({ default: m.Toaster })));

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Suspense fallback={null}>
        <Toaster />
      </Suspense>
    </BrowserRouter>
  );
}
