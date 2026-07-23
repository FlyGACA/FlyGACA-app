/**
 * Chat-page local state contracts: the message shape and the localStorage
 * persistence for quota, feedback, and the Pro-model preference. Page-local by
 * design — the pure logic lives in `@/calc/chatQuota` / `@/calc/chatFeedback`;
 * this file owns only the storage keys and the tolerant load/persist wrappers
 * (private mode and quota errors must never break the chat).
 */
import type { ChatSource, GroundingKind } from '@/lib/api';
import { currentUsage, type Usage } from '@/calc/chatQuota';
import { normalizeFeedback, type FeedbackMap } from '@/calc/chatFeedback';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
  sources?: ChatSource[];
  kind?: GroundingKind;
  refusalClass?: string;
  pending?: boolean;
  streaming?: boolean;
  error?: boolean;
}

const QUOTA_KEY = 'flygaca:adel-quota';
const FEEDBACK_KEY = 'flygaca:adel-feedback';
const PRO_KEY = 'flygaca:adel-pro';

export function loadUsage(): Usage {
  try {
    return currentUsage(JSON.parse(localStorage.getItem(QUOTA_KEY) ?? 'null'));
  } catch {
    return currentUsage(null);
  }
}

export function persistUsage(usage: Usage): void {
  try {
    localStorage.setItem(QUOTA_KEY, JSON.stringify(usage));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function loadFeedback(): FeedbackMap {
  try {
    return normalizeFeedback(JSON.parse(localStorage.getItem(FEEDBACK_KEY) ?? 'null'));
  } catch {
    return {};
  }
}

export function persistFeedback(map: FeedbackMap): void {
  try {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function loadProPref(): boolean {
  try {
    return localStorage.getItem(PRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function persistProPref(on: boolean): void {
  try {
    localStorage.setItem(PRO_KEY, on ? '1' : '0');
  } catch {
    /* ignore quota / private-mode errors */
  }
}
