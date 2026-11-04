import { useEffect, useState } from 'react';

/** The current time, updated every minute, so cards come due without a reload. */
export function useNow(every = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), every);
    return () => clearInterval(timer);
  }, [every]);
  return now;
}
