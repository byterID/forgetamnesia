import { lazy, type ComponentType } from 'react';
import HomeScreen from '@/features/home/HomeScreen';
import type { MessageKey } from '@/i18n';

/** Single source of truth for routes, bottom tabs and the More menu. */
export interface Screen {
  path: string;
  titleKey: MessageKey;
  component: ComponentType;
  /** 'tab' = bottom navigation, 'more' = listed on the More screen, undefined = reachable only by link. */
  placement?: 'tab' | 'more';
}

export const SCREENS: readonly Screen[] = [
  { path: '/', titleKey: 'screen.home', component: HomeScreen, placement: 'tab' },
  {
    path: '/operations',
    titleKey: 'screen.operations',
    component: lazy(() => import('@/features/operations/OperationsScreen')),
    placement: 'tab',
  },
  {
    path: '/calendar',
    titleKey: 'screen.calendar',
    component: lazy(() => import('@/features/calendar/CalendarScreen')),
    placement: 'tab',
  },
  {
    path: '/goals',
    titleKey: 'screen.goals',
    component: lazy(() => import('@/features/goals/GoalsScreen')),
    placement: 'tab',
  },
  {
    path: '/more',
    titleKey: 'screen.more',
    component: lazy(() => import('@/features/more/MoreScreen')),
    placement: 'tab',
  },
  {
    path: '/accounts',
    titleKey: 'screen.accounts',
    component: lazy(() => import('@/features/accounts/AccountsScreen')),
    placement: 'more',
  },
  {
    path: '/plans',
    titleKey: 'screen.plans',
    component: lazy(() => import('@/features/plans/PlansScreen')),
    placement: 'more',
  },
  {
    path: '/analytics',
    titleKey: 'screen.analytics',
    component: lazy(() => import('@/features/analytics/AnalyticsScreen')),
    placement: 'more',
  },
  {
    path: '/inbox',
    titleKey: 'screen.inbox',
    component: lazy(() => import('@/features/inbox/InboxScreen')),
    placement: 'more',
  },
  {
    path: '/settings',
    titleKey: 'screen.settings',
    component: lazy(() => import('@/features/settings/SettingsScreen')),
    placement: 'more',
  },
  {
    path: '/capture',
    titleKey: 'screen.capture',
    component: lazy(() => import('@/features/capture/CaptureScreen')),
  },
];

export const NotFoundScreen = lazy(() => import('@/features/not-found/NotFoundScreen'));
