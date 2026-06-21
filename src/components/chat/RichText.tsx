import { Fragment } from 'react';
import { parseMarkdown, type Inline } from '../../calc/markdown';

/**
 * Renders a Captain Adel answer as React elements from the {@link parseMarkdown}
 * block tree. It never injects HTML (no `dangerouslySetInnerHTML`), so malformed
 * or hostile model output renders as inert text. Used for finalized assistant
 * turns; mid-stream text stays plain in the bubble to avoid markdown flicker.
 */

function Spans({ spans }: { spans: Inline[] }) {
  return (
    <>
      {spans.map((s, i) => {
        if (s.type === 'bold') return <strong key={i}>{s.value}</strong>;
        if (s.type === 'code') return <code key={i}>{s.value}</code>;
        return <Fragment key={i}>{s.value}</Fragment>;
      })}
    </>
  );
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = parseMarkdown(text);

  // Nothing parseable (e.g. an answer that is pure whitespace) → render as-is.
  if (blocks.length === 0) return <span className={className}>{text}</span>;

  return (
    <div className={className}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'heading': {
            const Tag = `h${Math.min(b.level + 2, 6)}` as 'h3' | 'h4' | 'h5' | 'h6';
            return (
              <Tag key={i}>
                <Spans spans={b.spans} />
              </Tag>
            );
          }
          case 'ul':
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Spans spans={it} />
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Spans spans={it} />
                  </li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={i}>
                <Spans spans={b.spans} />
              </p>
            );
        }
      })}
    </div>
  );
}
