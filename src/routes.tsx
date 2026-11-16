import { Route, Routes } from 'react-router';
import { NotFoundScreen, SCREENS } from '@/screens';
import { AppLayout } from '@/ui/app-layout';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {SCREENS.map(({ path, component: Component }) =>
          path === '/' ? (
            <Route key={path} index element={<Component />} />
          ) : (
            <Route key={path} path={path.slice(1)} element={<Component />} />
          ),
        )}
        <Route path="*" element={<NotFoundScreen />} />
      </Route>
    </Routes>
  );
}
