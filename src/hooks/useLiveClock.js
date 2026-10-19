import { useState, useEffect } from 'react';

export function useLiveClock() {
  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const [timeStr, setTimeStr] = useState(formatTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(formatTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return timeStr;
}
