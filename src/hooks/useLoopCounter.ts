import { useRef, useCallback, useState } from 'react';

export function useLoopCounter(onTargetReached: () => void) {
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const countRef = useRef(0);
  const targetRef = useRef(0);

  const start = useCallback(
    (loopTarget: number) => {
      countRef.current = 0;
      targetRef.current = loopTarget;
      setCount(0);
      setTarget(loopTarget);
      setIsRunning(true);
    },
    []
  );

  const increment = useCallback(() => {
    if (!isRunning) return;
    countRef.current += 1;
    setCount(countRef.current);
    if (countRef.current >= targetRef.current) {
      setIsRunning(false);
      onTargetReached();
    }
  }, [isRunning, onTargetReached]);

  const stop = useCallback(() => {
    setIsRunning(false);
    setCount(0);
    setTarget(0);
    countRef.current = 0;
    targetRef.current = 0;
  }, []);

  return { count, target, isRunning, start, stop, increment };
}
