import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import { t } from '@/i18n';
import { SCREENS } from '@/screens';
import { cn } from '@/lib/utils';

const TABS = SCREENS.filter((screen) => screen.placement === 'tab');

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <main className="flex-1 p-4 pb-28">
        <Suspense fallback={<p>{t('common.loading')}</p>}>
          <Outlet />
        </Suspense>
      </main>
      <NavLink
        to="/capture"
        aria-label={t('nav.add')}
        className="fixed right-4 bottom-20 inline-flex size-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground shadow-lg"
      >
        +
      </NavLink>
      <nav
        aria-label={t('nav.label')}
        className="fixed inset-x-0 bottom-0 flex border-t border-border bg-background"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 min-w-11 flex-1 items-center justify-center px-1 text-xs',
                isActive ? 'font-semibold text-primary' : 'opacity-70',
              )
            }
          >
            {t(tab.titleKey)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
