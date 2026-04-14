import { useRef, useCallback, useState } from 'react';

export function useCountdownTimer(onExpired: () => void) {
  const [remaining, setRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(
    (minutes: number) => {
      stop();
      const totalSeconds = Math.round(minutes * 60);
      setRemaining(totalSeconds);
      setIsRunning(true);

      let left = totalSeconds;
      intervalRef.current = setInterval(() => {
        left -= 1;
        setRemaining(left);
        if (left <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsRunning(false);
          onExpired();
        }
      }, 1000);
    },
    [onExpired]
  );

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setRemaining(0);
  }, []);

  return { remaining, isRunning, start, stop };
}
