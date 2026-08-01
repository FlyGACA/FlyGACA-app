import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { CurrencyRing } from '@/components/CurrencyRing';

describe('<CurrencyRing />', () => {
  it('draws the status glyph and a partial arc for an expiring item', () => {
    const { container } = render(<CurrencyRing item={{ status: 'expiring', daysLeft: 45 }} />);
    // Half the 90-day horizon → offset is half the circumference.
    const arc = container.querySelector('circle:last-of-type') as SVGCircleElement;
    const circ = 2 * Math.PI * 15;
    expect(arc.style.getPropertyValue('--offset')).toBe((circ * 0.5).toFixed(2));
    expect(container.textContent).toContain('!');
  });

  it('reads empty with the ✕ glyph for an expired item', () => {
    const { container } = render(<CurrencyRing item={{ status: 'expired', daysLeft: -3 }} />);
    const arc = container.querySelector('circle:last-of-type') as SVGCircleElement;
    const circ = 2 * Math.PI * 15;
    expect(arc.style.getPropertyValue('--offset')).toBe(circ.toFixed(2)); // fully hidden
    expect(container.textContent).toContain('✕');
  });
});
