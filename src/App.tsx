import { BrowserRouter } from 'react-router';
import { AppRoutes } from '@/routes';
import { Toaster } from '@/ui/toaster';

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster />
    </BrowserRouter>
  );
}
