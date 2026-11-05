import { useEffect, useState } from 'react';
import { BLOCK_LABELS, useTerminal } from '../terminal/TerminalContext';

function formatClock(date: Date) {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

export function PageFooter() {
  const [now, setNow] = useState(() => formatClock(new Date()));
  const { activeBlock } = useTerminal();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(formatClock(new Date())), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <footer>
      <span className="status-left">
        <span className="status-ready">Ready</span>
        <span className="status-sep">│</span>
        <span className="status-info">
          pafhub <b>v0.2.0</b> · block <b>{BLOCK_LABELS[activeBlock]}</b>
        </span>
      </span>
      <span className="status-right">
        <span className="status-hint"><span className="status-key">0-4</span><span className="status-desc">:block</span></span>
        <span className="status-hint"><span className="status-key">Tab</span><span className="status-desc">:next</span></span>
        <span className="status-hint"><span className="status-key">↑↓</span><span className="status-desc">:select</span></span>
        <span className="status-hint"><span className="status-key">←→</span><span className="status-desc">:actions</span></span>
        <span className="status-sep">│</span>
        <span className="status-clock">{now}</span>
      </span>
    </footer>
  );
}
