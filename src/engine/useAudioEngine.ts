import { useSyncExternalStore } from 'react';
import { audioEngine } from './AudioEngine';
import type { AudioEngineState } from '../types/audio';

export function useAudioEngine(): AudioEngineState {
  return useSyncExternalStore(audioEngine.subscribe, audioEngine.getSnapshot);
}

export { audioEngine } from './AudioEngine';
