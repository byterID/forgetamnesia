import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { t } from '@/i18n';
import { AppRoutes } from '@/routes';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('routing', () => {
  it('shows Home at / and navigates between tabs via the bottom nav', async () => {
    const user = userEvent.setup();
    renderAt('/');
    expect(await screen.findByRole('heading', { name: t('screen.home') })).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: t('nav.label') });
    for (const [link, heading] of [
      ['nav.operations', 'screen.operations'],
      ['nav.calendar', 'screen.calendar'],
      ['nav.goals', 'screen.goals'],
      ['nav.home', 'screen.home'],
    ] as const) {
      await user.click(screen.getByRole('link', { name: t(link) }));
      expect(await screen.findByRole('heading', { name: t(heading) })).toBeInTheDocument();
    }
    expect(nav).toBeInTheDocument();
  });

  it('More menu reaches Plans, Analytics, Inbox, Settings (and Accounts)', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('link', { name: t('nav.more') }));
    for (const [link, heading] of [
      ['screen.accounts', 'screen.accounts'],
      ['screen.plans', 'screen.plans'],
      ['screen.analytics', 'screen.analytics'],
      ['screen.inbox', 'screen.inbox'],
      ['screen.settings', 'screen.settings'],
    ] as const) {
      await user.click(await screen.findByRole('link', { name: t(link) }));
      expect(await screen.findByRole('heading', { name: t(heading) })).toBeInTheDocument();
      await user.click(screen.getByRole('link', { name: t('nav.more') }));
    }
  });

  it('floating + opens /capture', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('link', { name: t('nav.add') }));
    expect(await screen.findByRole('heading', { name: t('screen.capture') })).toBeInTheDocument();
  });

  it('unknown route shows not-found', async () => {
    renderAt('/nope');
    expect(await screen.findByRole('heading', { name: t('screen.notFound') })).toBeInTheDocument();
  });
});
