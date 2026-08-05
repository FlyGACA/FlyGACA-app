import { useEffect, useState } from 'react';
import { dataUrl } from '@/lib/content';

interface FetchState {
  text: string | null;
  error: Error | null;
  loading: boolean;
}

/**
 * Loads a text/HTML asset at runtime with abort-on-unmount.
 *
 * An empty `path` is an explicit "nothing to fetch" — it settles idle (no text,
 * no error, not loading) rather than requesting the corpus root. Callers use it
 * to skip the request entirely: while the index that names the file is still in
 * flight, or for a cite-only doc whose body was never reproduced.
 */
export function useFetchText(path: string): FetchState {
  const [state, setState] = useState<FetchState>({ text: null, error: null, loading: !!path });

  useEffect(() => {
    if (!path) {
      setState({ text: null, error: null, loading: false });
      return;
    }
    const controller = new AbortController();
    setState({ text: null, error: null, loading: true });
    fetch(dataUrl(path), { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
        return res.text();
      })
      .then((text) => setState({ text, error: null, loading: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ text: null, error: error as Error, loading: false });
      });
    return () => controller.abort();
  }, [path]);

  return state;
}

/**
 * Strip active content from the trusted-but-machine-made GACAR HTML corpus
 * (same-origin, not user-generated): script/style/iframe/object/embed tags,
 * inline event-handler attributes, and javascript: URLs. Defense-in-depth.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(iframe|object|embed|link|meta)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\b(href|src)\s*=\s*"javascript:[^"]*"/gi, '')
    .replace(/\b(href|src)\s*=\s*'javascript:[^']*'/gi, '');
}

/** Pull TOC entries from `<h3 id="...">Title</h3>` headings. */
export function tocFromHtml(html: string): { id: string; title: string }[] {
  const out: { id: string; title: string }[] = [];
  const re = /<h[23]\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h[23]>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out.push({ id: m[1], title: m[2].replace(/<[^>]+>/g, '').trim() });
  }
  return out;
}
