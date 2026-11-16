import { render, screen } from '@testing-library/react';
import { App } from '@/App';

describe('App', () => {
  it('renders the app root', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'ForgetAmnesia' })).toBeInTheDocument();
  });
});
