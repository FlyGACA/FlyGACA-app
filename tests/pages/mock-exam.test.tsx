import { describe, expect, it, afterEach, vi } from 'vitest';
import { screen, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderWithRouter } from '../helpers/render';

let proEnabled = true;
vi.mock('@/lib/services/features', () => ({
  useFeature: () => proEnabled,
}));

import { MockExam } from '@/pages/study/MockExam';

const fixture = {
  exam: { title: 'GACA Private Pilot Exam', questions: 2, minutes: 10, passMark: 70 },
  banks: [
    {
      id: 'regulations',
      title: 'Regulations Bank',
      desc: 'Air Law',
      source: 'GACAR Part 91',
      questions: [
        {
          q: 'What is the standard VFR cruising altitude rule in Saudi Arabia?',
          options: [
            'Magnetic course 000-179: Odd thousands + 500',
            'Magnetic course 180-359: Odd thousands + 500',
            'True course only',
            'No rules apply',
          ],
          answer: 0,
          explain: 'GACAR §91.159 prescribes VFR cruising altitudes above 3,000 ft AGL.',
          cite: 'GACAR Part 91, §91.159',
          citeRef: { kind: 'regulations', id: 'part-91', anchor: 'sec-91-159' },
        },
        {
          q: 'What is the emergency transponder squawk code?',
          options: ['7500', '7600', '7700', '7000'],
          answer: 2,
          explain: 'Squawk 7700 indicates an airborne emergency condition.',
          cite: 'GACAR Part 91 General Rules',
        },
      ],
    },
  ],
};

const okJson = (body: unknown) =>
  ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as unknown as Response;

beforeEach(() => {
  proEnabled = true;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  act(() => void i18n.changeLanguage('en'));
});

describe('<MockExam /> review with GACAR citations and explanations', () => {
  it('renders explanations and GACAR citation links in the post-exam review list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson(fixture)));
    const user = userEvent.setup();
    renderWithRouter(<MockExam />);

    // Click "Start CBT exam"
    const startBtn = await screen.findByRole('button', { name: /Start CBT exam|Start exam/i });
    await user.click(startBtn);

    // Question 1 appears: select an option
    const opt0 = await screen.findByRole('button', { name: /Magnetic course 000-179|7700/i });
    await user.click(opt0);

    // Advance to Q2
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    await user.click(nextBtn);

    // Select an option for Q2
    const optQ2 = await screen.findByRole('button', { name: /7700|Magnetic course 000-179/i });
    await user.click(optQ2);

    // Review & submit button
    const reviewSubmitBtn = screen.getByRole('button', { name: /Review & submit|Submit/i });
    await user.click(reviewSubmitBtn);

    // Summary screen appears: submit exam
    const submitFinalBtn = await screen.findByRole('button', { name: /Submit exam/i });
    await user.click(submitFinalBtn);

    // Post-exam review list renders
    expect(await screen.findByText(/Review answers/i)).toBeInTheDocument();

    // Verify explanation is rendered for questions
    expect(
      screen.getByText(/GACAR §91\.159 prescribes VFR cruising altitudes/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Squawk 7700 indicates an airborne emergency condition/i),
    ).toBeInTheDocument();

    // Verify citation link with href is rendered for the question with citeRef
    const citeLink = screen.getByRole('link', { name: /GACAR Part 91, §91\.159/i });
    expect(citeLink).toBeInTheDocument();
    expect(citeLink).toHaveAttribute('href', '/library/part-91#sec-91-159');

    // Verify plain citation text is rendered for the question without citeRef
    expect(screen.getByText(/GACAR Part 91 General Rules/i)).toBeInTheDocument();
  });

  it('shows the Pro gate when user is not entitled to mock exams', async () => {
    proEnabled = false;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson(fixture)));
    renderWithRouter(<MockExam />);

    expect(await screen.findByText(/Mock exams are part of Pro/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Start CBT exam|Start exam/i }),
    ).not.toBeInTheDocument();
  });
});
