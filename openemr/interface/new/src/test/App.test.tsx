import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// The login page resolves its copy through i18n; stub the server config so
// init runs deterministically against English.
vi.mock('../api/nest-client', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { language: 'en' } }) },
}));

import { initI18n } from '../i18n';

describe('App', () => {
  beforeAll(async () => {
    localStorage.setItem('openrx_lang', 'en');
    await initI18n();
  });

  it('renders login page when not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );

    // Brand + tagline render in both the marketing panel and the mobile header.
    expect(screen.getAllByText('OpenRx Health').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Electronic Prescription & Health Records').length,
    ).toBeGreaterThan(0);
  });

  it('shows the sign in button on the login page', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /staff registration/i })).toBeInTheDocument();
  });
});

