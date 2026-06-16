/**
 * Client for the Fly GACA gateway. The app talks to the SAME backend as the
 * legacy site: `/api/chat` (proxied to the Captain Adel brain) and
 * `/api/content` (gated assets). We are not rebuilding the server.
 *
 * The /v1/chat contract (see the gateway↔brain CONTRACT):
 *   { message, history, product, provider, session } → { answer, sources[] }
 */

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSource {
  citation: string;
  url: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatTurn[];
  /** Defaults to 'flygaca'. */
  product?: string;
  provider?: string;
  session?: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

/** Sends a chat turn to the gateway. `authToken` is the Firebase ID token. */
export async function sendChat(req: ChatRequest, authToken?: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      message: req.message,
      history: req.history ?? [],
      product: req.product ?? 'flygaca',
      provider: req.provider,
      session: req.session,
    }),
  });
  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }
  return (await res.json()) as ChatResponse;
}
