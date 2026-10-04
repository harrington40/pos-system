import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import nestClient from '../api/nest-client';
import BookAppointmentPage from '../features/booking/BookAppointmentPage';
import VideoConsultPage from '../features/telehealth/VideoConsultPage';

// The booking page posts straight to the NestJS backend; stub the axios wrapper
// so no request leaves the test.
vi.mock('../api/nest-client', () => ({
  default: { post: vi.fn(), get: vi.fn(), patch: vi.fn() },
}));

// Signalling must never actually dial out from a unit test.
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() })),
}));

const post = nestClient.post as unknown as ReturnType<typeof vi.fn>;

// jsdom does not implement scrollTo/scrollIntoView; the page calls both.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
Element.prototype.scrollIntoView = vi.fn();

/** Fill the required fields and submit the booking form. */
function submitBooking() {
  const form = document.querySelector('form') as HTMLFormElement;
  const inputs = form.querySelectorAll('input');
  fireEvent.change(inputs[0], { target: { value: 'Ada' } }); // first name
  fireEvent.change(inputs[1], { target: { value: 'Lovelace' } }); // last name
  fireEvent.change(inputs[2], { target: { value: '0770000000' } }); // phone
  fireEvent.change(inputs[4], { target: { value: '2026-05-01' } }); // preferred date
  fireEvent.submit(form);
}

describe('BookAppointmentPage — consultation type', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    post.mockResolvedValue({
      data: { id: 12, status: 'pending', consultation_type: 'video', video_room: 'vc-abc12345' },
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <BookAppointmentPage />
      </MemoryRouter>,
    );

  it('offers an in-person / video choice and defaults to in person', () => {
    renderPage();
    expect(screen.getByText('Consultation type')).toBeInTheDocument();
    const inPerson = screen.getByRole('button', { name: /In person/ });
    const video = screen.getByRole('button', { name: /Video call/ });
    expect(inPerson).toHaveAttribute('aria-pressed', 'true');
    expect(video).toHaveAttribute('aria-pressed', 'false');
    // The video option is deliberately promoted: interactive card + "Popular" flag.
    expect(video).toHaveClass('vc-option');
    expect(screen.getByText('Popular')).toBeInTheDocument();
  });

  it('promotes video from the hero callout and preselects it', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Start a video visit/i }));
    const video = screen.getByRole('button', { name: /Video call/ });
    expect(video).toHaveAttribute('aria-pressed', 'true');
    expect(video).toHaveClass('vc-option-video-active');
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('submits an in-person booking by default', async () => {
    renderPage();
    submitBooking();

    await waitFor(() => expect(post).toHaveBeenCalled());
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/booking/request');
    expect(body).toMatchObject({ consultation_type: 'in_person', source: 'whatsapp' });
  });

  it('submits a video booking and hands back the room invite link', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Video call/ }));
    // Choosing video surfaces the "we will send you a link" hint before submit.
    expect(screen.getByText(/private video link/i)).toBeInTheDocument();

    submitBooking();

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][1]).toMatchObject({ consultation_type: 'video' });

    expect(await screen.findByText(/Video consultation requested/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/\/video\/vc-abc12345$/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Join video room now/i })).toHaveAttribute(
      'href',
      '/video/vc-abc12345',
    );
  });
});

describe('VideoConsultPage — public telehealth room', () => {
  it('names the room, the joining role and the invite URL', () => {
    render(
      <MemoryRouter initialEntries={['/video/vc-test123?role=physician']}>
        <Routes>
          <Route path="/video/:room" element={<VideoConsultPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Room vc-test123/)).toBeInTheDocument();
    expect(screen.getByText(/joined as physician/)).toBeInTheDocument();
    // jsdom exposes no camera, so the page must fail gracefully rather than crash.
    expect(screen.getByText(/Could not access your camera\/microphone/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\/video\/vc-test123/).length).toBeGreaterThan(0);
  });
});
