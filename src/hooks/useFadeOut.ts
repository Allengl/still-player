import { useRef, useCallback, useState } from 'react';
import { FADE_STEPS, FADE_INTERVAL } from '../constants/config';
import { audioEngine } from '../engine/AudioEngine';

export function useFadeOut(onFadeComplete: () => void) {
  const [fadeProgress, setFadeProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalVolumeRef = useRef(1.0);
  const stepRef = useRef(0);

  const startFade = useCallback(() => {
    cancelFade();
    const state = audioEngine.getSnapshot();
    originalVolumeRef.current = state.volume;
    stepRef.current = 0;
    setIsFading(true);
    setFadeProgress(0);

    intervalRef.current = setInterval(() => {
      stepRef.current += 1;
      const fraction = stepRef.current / FADE_STEPS;
      const newVolume = originalVolumeRef.current * (1 - fraction);
      audioEngine.setVolume(Math.max(0, newVolume));
      setFadeProgress(fraction);

      if (stepRef.current >= FADE_STEPS) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        audioEngine.pause();
        audioEngine.setVolume(originalVolumeRef.current);
        setIsFading(false);
        setFadeProgress(0);
        onFadeComplete();
      }
    }, FADE_INTERVAL);
  }, [onFadeComplete]);

  const cancelFade = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (isFading) {
      audioEngine.setVolume(originalVolumeRef.current);
    }
    setIsFading(false);
    setFadeProgress(0);
    stepRef.current = 0;
  }, [isFading]);

  return { fadeProgress, isFading, startFade, cancelFade };
}
