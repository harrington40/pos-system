import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

vi.mock('../features/stroke-care/StrokeCarePage', () => ({
  default: () => <div>Stroke workspace</div>,
}));

describe('App', () => {
  it('renders login page when not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('OpenRx Health').length).toBeGreaterThan(0);
    expect(screen.getByText('Sign in to your workspace')).toBeInTheDocument();
  });

  it('shows sign in button on login page', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  describe('Stroke deep links', () => {
    afterEach(() => localStorage.clear());

    it('serves the stroke workspace at /stroke', async () => {
      localStorage.setItem(
        'openemr_user',
        JSON.stringify({
          username: 'clinician',
          displayName: 'Clinician',
          role: 'physician',
          token: 'test-token',
        }),
      );

      render(
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: { queries: { retry: false } },
            })
          }
        >
          <MemoryRouter initialEntries={['/stroke']}>
            <App />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      expect(await screen.findByText('Stroke workspace')).toBeInTheDocument();
    });
  });
});
