import type { ReactNode } from 'react';

type HintLinkProps = {
  /** Key cap shown before the label, e.g. "t" renders as [t]:Store. */
  keyLabel: string;
  children: ReactNode;
  href: string;
  title?: string;
};

/**
 * Anchor variant of HintButton: a text-only `key:label` link that opens its
 * target in a new tab. Used for the third-party store link in the game card.
 */
export function HintLink({ keyLabel, children, href, title }: HintLinkProps) {
  return (
    <a
      className="hint-btn hint-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      aria-label={title}
    >
      <span className="hint-key">{keyLabel}</span>
      <span className="hint-label">:{children}</span>
    </a>
  );
}
