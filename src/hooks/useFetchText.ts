import { useEffect, useState } from 'react';
import { dataUrl } from '@/lib/content';

interface FetchState {
  text: string | null;
  error: Error | null;
  loading: boolean;
}

/** Loads a text/HTML asset at runtime with abort-on-unmount. */
export function useFetchText(path: string): FetchState {
  const [state, setState] = useState<FetchState>({ text: null, error: null, loading: true });

  useEffect(() => {
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
 * Sanitize the trusted-but-machine-made GACAR HTML corpus (same-origin, not
 * user-generated) with a parser-based allowlist: DOMParser builds a real DOM,
 * then any tag/attribute outside the allowlist — plus event handlers and
 * javascript:/data:/vbscript: URLs — is stripped. Regex sanitizers can be
 * bypassed by malformed markup the HTML parser interprets differently
 * (mutation XSS); parsing first removes that whole class. Defense-in-depth.
 */
const ALLOWED_TAGS = new Set([
  'a','p','br','strong','em','b','i','u','s','ul','ol','li','blockquote','code','pre',
  'h1','h2','h3','h4','h5','h6','table','thead','tbody','tr','th','td','span','div','hr','img','figure','figcaption'
]);
const ALLOWED_ATTRS = new Set(['href','src','alt','title','class','id','colspan','rowspan']);

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const tag = el.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) { el.remove(); continue; }
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          if (!ALLOWED_ATTRS.has(name) || name.startsWith('on')) { el.removeAttribute(attr.name); continue; }
          if ((name === 'href' || name === 'src')) {
            const v = attr.value.trim().toLowerCase();
            if (v.startsWith('javascript:') || v.startsWith('data:') || v.startsWith('vbscript:')) {
              el.removeAttribute(attr.name);
            }
          }
        }
        walk(el);
      }
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
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
