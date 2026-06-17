/**
 * Builds a deep link into Captain Adel pre-primed with a question. Mirrors the
 * legacy FGCalc "Ask Captain Adel to explain" affordance, which passes the
 * prompt as ?q= to the chat page.
 */
export function adelLink(prompt: string | null | undefined): string | null {
  if (!prompt) return null;
  return `/chat?q=${encodeURIComponent(prompt)}`;
}
