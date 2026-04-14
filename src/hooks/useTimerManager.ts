import { useEffect, useCallback, useState } from 'react';
import { audioEngine } from '../engine/AudioEngine';
import { useCountdownTimer } from './useCountdownTimer';
import { useLoopCounter } from './useLoopCounter';
import { useFadeOut } from './useFadeOut';
import type { TimerMode, TimerContext } from '../types/timer';

export function useTimerManager(): TimerContext & {
  startCountdown: (minutes: number) => void;
  startLoopCounter: (target: number) => void;
  cancelTimer: () => void;
} {
  const [mode, setMode] = useState<TimerMode>('none');

  const onTimerExpired = useCallback(() => {
    fadeOut.startFade();
  }, []);

  const onFadeComplete = useCallback(() => {
    setMode('none');
  }, []);

  const countdown = useCountdownTimer(onTimerExpired);
  const loopCounter = useLoopCounter(onTimerExpired);
  const fadeOut = useFadeOut(onFadeComplete);

  // Subscribe to loop-completed events for loop counter
  useEffect(() => {
    if (mode !== 'loop-counter') return;
    return audioEngine.onLoopCompleted(() => {
      loopCounter.increment();
    });
  }, [mode, loopCounter.increment]);

  const startCountdown = useCallback(
    (minutes: number) => {
      loopCounter.stop();
      fadeOut.cancelFade();
      setMode('countdown');
      countdown.start(minutes);
    },
    [countdown, loopCounter, fadeOut]
  );

  const startLoopCounter = useCallback(
    (target: number) => {
      countdown.stop();
      fadeOut.cancelFade();
      setMode('loop-counter');
      loopCounter.start(target);
    },
    [countdown, loopCounter, fadeOut]
  );

  const cancelTimer = useCallback(() => {
    countdown.stop();
    loopCounter.stop();
    fadeOut.cancelFade();
    setMode('none');
  }, [countdown, loopCounter, fadeOut]);

  const state = (() => {
    if (fadeOut.isFading) return 'fading-out' as const;
    if (mode === 'countdown' && countdown.isRunning) return 'countdown-running' as const;
    if (mode === 'loop-counter' && loopCounter.isRunning) return 'counter-running' as const;
    return 'inactive' as const;
  })();

  return {
    state,
    config: {
      mode,
      countdownMinutes: 0,
      loopTarget: loopCounter.target,
    },
    countdownRemaining: countdown.remaining,
    loopsCounted: loopCounter.count,
    fadeProgress: fadeOut.fadeProgress,
    startCountdown,
    startLoopCounter,
    cancelTimer,
  };
}
