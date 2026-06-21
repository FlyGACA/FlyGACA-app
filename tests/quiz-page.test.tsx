import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '../src/i18n';
import { Quiz } from '../src/pages/study/Quiz';

// A minimal QuizData fixture (one bank, one question) matching src/lib/content.ts.
const fixture = {
  exam: { title: 'Exam', questions: 1, minutes: 5, passMark: 70 },
  banks: [
    {
      id: 'test-bank',
      title: 'Test Bank',
      desc: 'A test bank',
      source: 'GACAR Part 61',
      questions: [{ q: 'What is 2+2?', options: ['2', '3', '4', '5'], answer: 2, explain: 'Arithmetic.' }],
    },
  ],
};

const okJson = (body: unknown) =>
  ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as unknown as Response;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  act(() => void i18n.changeLanguage('en'));
});

describe('<Quiz /> interaction', () => {
  it('picks a bank, answers correctly, and shows the score', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson(fixture)));
    const user = userEvent.setup();
    render(<Quiz />);

    // Bank selection appears once the (stubbed) data load resolves.
    await user.click(await screen.findByRole('button', { name: /Test Bank/ }));

    // The question + its options render.
    expect(await screen.findByText('What is 2+2?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '4' }));

    // Picking an answer reveals the explanation and the advance control.
    expect(screen.getByText(/Explanation/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'See result' }));

    // Final score: 1/1 = 100%.
    expect(await screen.findByText('100%')).toBeInTheDocument();
    expect(screen.getByText('1 of 1 correct')).toBeInTheDocument();
  });

  it('surfaces a load error with a retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' } as Response),
    );
    render(<Quiz />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
