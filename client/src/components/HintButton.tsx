import type { ReactNode } from 'react';

type HintButtonProps = {
  /** Key cap shown before the label, e.g. "a" renders as [a]:Add. */
  keyLabel: string;
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  title?: string;
  danger?: boolean;
  compact?: boolean;
  className?: string;
};

/**
 * Text-only action in the lazyflow status-bar style: a yellow key cap followed
 * by a muted ":Label". No icons, no filled chrome.
 */
export function HintButton({
  keyLabel,
  children,
  onClick,
  type = 'button',
  disabled,
  title,
  danger,
  compact,
  className,
}: HintButtonProps) {
  const classes = ['hint-btn'];
  if (danger) classes.push('hint-danger');
  if (compact) classes.push('hint-compact');
  if (className) classes.push(className);

  return (
    <button
      type={type}
      className={classes.join(' ')}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <span className="hint-key">{keyLabel}</span>
      <span className="hint-label">:{children}</span>
    </button>
  );
}
