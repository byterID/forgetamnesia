import { render, screen } from '@testing-library/react';
import { App } from '@/App';
import { t } from '@/i18n';

describe('App', () => {
  it('renders the app root with Home', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: t('screen.home') })).toBeInTheDocument();
  });
});
