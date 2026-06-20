import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrollIntoView; components that keep an active item in
// view (e.g. the command palette) call it in an effect. Make it a no-op.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
