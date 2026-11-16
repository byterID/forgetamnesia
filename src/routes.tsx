import { lazy } from 'react';
import { Route, Routes } from 'react-router';
import HomeScreen from '@/features/home/HomeScreen';
import { AppLayout } from '@/ui/app-layout';

const OperationsScreen = lazy(() => import('@/features/operations/OperationsScreen'));
const CalendarScreen = lazy(() => import('@/features/calendar/CalendarScreen'));
const GoalsScreen = lazy(() => import('@/features/goals/GoalsScreen'));
const MoreScreen = lazy(() => import('@/features/more/MoreScreen'));
const AccountsScreen = lazy(() => import('@/features/accounts/AccountsScreen'));
const PlansScreen = lazy(() => import('@/features/plans/PlansScreen'));
const AnalyticsScreen = lazy(() => import('@/features/analytics/AnalyticsScreen'));
const InboxScreen = lazy(() => import('@/features/inbox/InboxScreen'));
const SettingsScreen = lazy(() => import('@/features/settings/SettingsScreen'));
const CaptureScreen = lazy(() => import('@/features/capture/CaptureScreen'));
const NotFoundScreen = lazy(() => import('@/features/not-found/NotFoundScreen'));

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomeScreen />} />
        <Route path="operations" element={<OperationsScreen />} />
        <Route path="calendar" element={<CalendarScreen />} />
        <Route path="goals" element={<GoalsScreen />} />
        <Route path="more" element={<MoreScreen />} />
        <Route path="accounts" element={<AccountsScreen />} />
        <Route path="plans" element={<PlansScreen />} />
        <Route path="analytics" element={<AnalyticsScreen />} />
        <Route path="inbox" element={<InboxScreen />} />
        <Route path="settings" element={<SettingsScreen />} />
        <Route path="capture" element={<CaptureScreen />} />
        <Route path="*" element={<NotFoundScreen />} />
      </Route>
    </Routes>
  );
}
