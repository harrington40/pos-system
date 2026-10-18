import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

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
});
