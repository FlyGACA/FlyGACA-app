/**
 * Pure helper that turns the latest Captain Adel answer into contextual
 * follow-up chips. No DOM/i18n imports: it returns structured descriptors
 * (an i18n key + interpolation params) and the page renders/translates them, so
 * the chips stay bilingual. Replaces the three hard-coded follow-ups with ones
 * that reference the actual rule the answer cited.
 */

interface SourceLike {
  citation?: string;
  section?: string;
  part?: string;
}

export interface FollowupMsg {
  kind?: 'grounded' | 'partial' | 'refusal' | 'na';
  sources?: SourceLike[];
}

export interface Followup {
  /** i18n key suffix under `chat.followups.*`. */
  id: string;
  /** Interpolation values for the label/prompt template. */
  cite?: string;
  part?: string;
}

/** Leading Part number from any citation field (e.g. "91.155(a)" → "91"). */
function partNumber(s: SourceLike): string | undefined {
  return s.part?.trim() || /(\d+)/.exec(s.citation ?? s.section ?? '')?.[1];
}

/**
 * Up to three follow-ups tailored to `msg`. Refusals get none. When the answer
 * cited a rule we offer "show the exact text" and "what else does Part N cover",
 * then fall back to the evergreen "explain simply" / "practical example".
 */
export function followupSuggestions(msg: FollowupMsg | undefined): Followup[] {
  if (!msg || msg.kind === 'refusal') return [];

  const out: Followup[] = [];
  const cited = msg.sources?.find((s) => s.citation || s.section || s.part);
  const cite = cited?.citation || cited?.section;
  const part = cited ? partNumber(cited) : undefined;

  if (cite) out.push({ id: 'exactText', cite });
  if (part) out.push({ id: 'related', part });
  // A partial answer benefits from pinning the precise section first.
  if (msg.kind === 'partial' && !cite) out.push({ id: 'section' });
  out.push({ id: 'simple' });
  out.push({ id: 'example' });

  return out.slice(0, 3);
}
