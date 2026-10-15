import { useEffect, useState } from 'react';

function formatClock(date: Date) {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

export function PageFooter() {
  const [now, setNow] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(formatClock(new Date())), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <footer>
      <span className="status-left">
        <span className="status-ready">Ready</span>
        <span className="status-sep">│</span>
        <span className="status-info">pafhub <b>v0.2.0</b></span>
      </span>
      <span className="status-right">
        <span className="status-hint"><span className="status-key">/</span><span className="status-desc">:search</span></span>
        <span className="status-hint"><span className="status-key">a</span><span className="status-desc">:add</span></span>
        <span className="status-hint"><span className="status-key">u</span><span className="status-desc">:update</span></span>
        <span className="status-hint"><span className="status-key">?</span><span className="status-desc">:help</span></span>
        <span className="status-sep">│</span>
        <span className="status-clock">{now}</span>
      </span>
    </footer>
  );
}
