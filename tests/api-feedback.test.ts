import { describe, expect, it, vi, afterEach } from 'vitest';
import { sendFeedback } from '@/lib/api';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const okRes = () => ({ ok: true, status: 204 }) as unknown as Response;

describe('sendFeedback', () => {
  it('posts the rating to /api/feedback with the JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okRes());
    vi.stubGlobal('fetch', fetchMock);

    await sendFeedback({ rating: 'up', session: 's1', question: 'q', answer: 'a' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/feedback');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      rating: 'up',
      session: 's1',
      question: 'q',
      answer: 'a',
    });
  });

  it('attaches auth and App Check tokens when supplied', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okRes());
    vi.stubGlobal('fetch', fetchMock);

    await sendFeedback({ rating: 'down' }, 'id-token', 'appcheck-token');

    const { headers } = fetchMock.mock.calls[0][1];
    expect(headers.Authorization).toBe('Bearer id-token');
    expect(headers['X-Firebase-AppCheck']).toBe('appcheck-token');
  });

  it('throws on a non-OK response so callers can decide to ignore it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response));
    await expect(sendFeedback({ rating: 'up' })).rejects.toThrow(/500/);
  });

  it('forwards an AbortSignal to fetch so the POST is cancellable on unmount', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okRes());
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    await sendFeedback({ rating: 'up' }, undefined, undefined, controller.signal);

    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });
});
