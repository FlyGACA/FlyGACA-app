import { describe, expect, it } from 'vitest';
import { canCheckout, startProCheckout } from '../src/lib/billing';

// No Firebase config in tests → billing is unavailable and never reaches a
// network call; the web build keeps the CTA disabled via canCheckout().
describe('billing without config', () => {
  it('cannot check out', () => {
    expect(canCheckout()).toBe(false);
  });

  it('throws billing-unavailable instead of calling a missing function', async () => {
    await expect(startProCheckout('annual')).rejects.toThrow('billing-unavailable');
  });
});
