export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused';
export type ABMarkerState = 'unmarked' | 'a-set' | 'ab-looping';

export interface ABMarkers {
  state: ABMarkerState;
  pointA: number | null; // seconds
  pointB: number | null; // seconds
}

export interface AudioTrack {
  id: string;
  name: string;
  uri: string;
  fileName: string;
  sizeBytes: number;
  importedAt: number;
}

export interface AudioEngineState {
  playbackState: PlaybackState;
  currentTrack: AudioTrack | null;
  currentTime: number;
  duration: number;
  volume: number;
  abMarkers: ABMarkers;
}
