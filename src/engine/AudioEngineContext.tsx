import React, { createContext, useContext, useRef, useEffect } from 'react';
import { AudioEngine, audioEngine } from './AudioEngine';

const AudioEngineContext = createContext<AudioEngine>(audioEngine);

export function AudioEngineProvider({ children }: { children: React.ReactNode }) {
  const engineRef = useRef(audioEngine);

  useEffect(() => {
    return () => {
      // Don't destroy on unmount since it's a singleton
      // engineRef.current.destroy();
    };
  }, []);

  return (
    <AudioEngineContext.Provider value={engineRef.current}>
      {children}
    </AudioEngineContext.Provider>
  );
}

export function useAudioEngineRef(): AudioEngine {
  return useContext(AudioEngineContext);
}
