import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer, AudioEvents } from 'expo-audio';
import type {
  AudioTrack,
  PlaybackState,
  ABMarkerState,
  ABMarkers,
  AudioEngineState,
} from '../types/audio';
import type { AudioStatus } from 'expo-audio';

type LoopCompletedListener = () => void;

const INITIAL_AB_MARKERS: ABMarkers = {
  state: 'unmarked',
  pointA: null,
  pointB: null,
};

const INITIAL_STATE: AudioEngineState = {
  playbackState: 'idle',
  currentTrack: null,
  currentTime: 0,
  duration: 0,
  volume: 1.0,
  abMarkers: { ...INITIAL_AB_MARKERS },
};

export class AudioEngine {
  private state: AudioEngineState = { ...INITIAL_STATE };
  private listeners = new Set<() => void>();
  private loopListeners = new Set<LoopCompletedListener>();
  private player: AudioPlayer | null = null;
  private isSeeking = false;
  private statusSubscription: ReturnType<AudioPlayer['addListener']> | null = null;

  constructor() {
    this.initAudioMode();
  }

  private async initAudioMode() {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    });
  }

  // ──── useSyncExternalStore contract ────

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): AudioEngineState => {
    return this.state;
  };

  private notify() {
    this.state = { ...this.state };
    this.listeners.forEach((fn) => fn());
  }

  // ──── Loop event system ────

  onLoopCompleted = (listener: LoopCompletedListener): (() => void) => {
    this.loopListeners.add(listener);
    return () => this.loopListeners.delete(listener);
  };

  private emitLoopCompleted() {
    this.loopListeners.forEach((fn) => fn());
  }

  // ──── Public getters ────

  getPlayer(): AudioPlayer | null {
    return this.player;
  }

  // ──── Playback controls ────

  async loadTrack(track: AudioTrack) {
    this.releasePlayer();
    this.state = {
      ...this.state,
      playbackState: 'loading',
      currentTrack: track,
      currentTime: 0,
      duration: 0,
      abMarkers: { ...INITIAL_AB_MARKERS },
    };
    this.notify();

    try {
      this.player = createAudioPlayer(
        { uri: track.uri },
        { updateInterval: 50 }
      );

      this.statusSubscription = this.player.addListener(
        'playbackStatusUpdate',
        (status: AudioStatus) => this.handleStatusUpdate(status)
      );

      // Wait for isLoaded via status updates — play will be called in handleStatusUpdate
    } catch {
      this.state = { ...INITIAL_STATE };
      this.notify();
    }
  }

  play() {
    if (!this.player) return;
    if (
      this.state.playbackState === 'paused' ||
      this.state.playbackState === 'loading'
    ) {
      this.player.play();
      this.state = { ...this.state, playbackState: 'playing' };
      this.notify();
    }
  }

  pause() {
    if (!this.player) return;
    if (this.state.playbackState === 'playing') {
      this.player.pause();
      this.state = { ...this.state, playbackState: 'paused' };
      this.notify();
    }
  }

  async stop() {
    if (!this.player) return;
    this.player.pause();
    await this.player.seekTo(0);
    this.state = {
      ...this.state,
      playbackState: 'idle',
      currentTime: 0,
      abMarkers: { ...INITIAL_AB_MARKERS },
    };
    this.isSeeking = false;
    this.notify();
  }

  async seekTo(seconds: number) {
    if (!this.player) return;
    this.isSeeking = true;
    await this.player.seekTo(seconds);
    this.state = { ...this.state, currentTime: seconds };
    this.isSeeking = false;
    this.notify();
  }

  setVolume(volume: number) {
    if (this.player) {
      this.player.volume = volume;
    }
    this.state = { ...this.state, volume };
    this.notify();
  }

  // ──── A-B Markers ────

  markA() {
    if (
      this.state.playbackState !== 'playing' &&
      this.state.playbackState !== 'paused'
    )
      return;

    this.state = {
      ...this.state,
      abMarkers: {
        state: 'a-set',
        pointA: this.state.currentTime,
        pointB: null,
      },
    };
    this.notify();
  }

  markB() {
    if (this.state.abMarkers.state !== 'a-set') return;
    if (this.state.currentTime <= (this.state.abMarkers.pointA ?? 0)) return;

    this.state = {
      ...this.state,
      abMarkers: {
        state: 'ab-looping',
        pointA: this.state.abMarkers.pointA,
        pointB: this.state.currentTime,
      },
    };
    this.notify();
  }

  clearAB() {
    this.state = {
      ...this.state,
      abMarkers: { ...INITIAL_AB_MARKERS },
    };
    this.notify();
  }

  adjustA(deltaSeconds: number) {
    const { abMarkers, duration } = this.state;
    if (abMarkers.pointA === null) return;

    const newA = Math.max(0, Math.min(abMarkers.pointA + deltaSeconds, duration));

    if (abMarkers.state === 'ab-looping' && abMarkers.pointB !== null) {
      if (newA >= abMarkers.pointB) return;
    }

    this.state = {
      ...this.state,
      abMarkers: { ...abMarkers, pointA: newA },
    };
    this.notify();
  }

  adjustB(deltaSeconds: number) {
    const { abMarkers, duration } = this.state;
    if (abMarkers.state !== 'ab-looping' || abMarkers.pointB === null) return;
    if (abMarkers.pointA === null) return;

    const newB = Math.max(
      abMarkers.pointA + 0.01,
      Math.min(abMarkers.pointB + deltaSeconds, duration)
    );

    this.state = {
      ...this.state,
      abMarkers: { ...abMarkers, pointB: newB },
    };
    this.notify();
  }

  // ──── Lock screen ────

  activateLockScreen() {
    if (!this.player || !this.state.currentTrack) return;
    this.player.setActiveForLockScreen(true, {
      title: this.state.currentTrack.name,
      artist: 'Vibe',
    });
  }

  // ──── Status update handler ────

  private handleStatusUpdate(status: AudioStatus) {
    // Handle initial load
    if (status.isLoaded && this.state.playbackState === 'loading') {
      this.player?.play();
      this.state = {
        ...this.state,
        playbackState: 'playing',
        duration: status.duration,
        currentTime: status.currentTime,
      };
      this.activateLockScreen();
      this.notify();
      return;
    }

    // Handle track finished (only when not AB looping)
    if (status.didJustFinish && this.state.abMarkers.state !== 'ab-looping') {
      this.state = {
        ...this.state,
        playbackState: 'idle',
        currentTime: 0,
      };
      this.notify();
      return;
    }

    // A-B loop enforcement
    if (
      this.state.abMarkers.state === 'ab-looping' &&
      this.state.abMarkers.pointB !== null &&
      this.state.abMarkers.pointA !== null &&
      !this.isSeeking
    ) {
      if (status.currentTime >= this.state.abMarkers.pointB || status.didJustFinish) {
        this.isSeeking = true;
        this.player
          ?.seekTo(this.state.abMarkers.pointA!)
          .then(() => {
            this.isSeeking = false;
            if (this.player && this.state.playbackState === 'playing') {
              this.player.play();
            }
          })
          .catch(() => {
            this.isSeeking = false;
          });
        this.emitLoopCompleted();
      }
    }

    // Regular status update
    this.state = {
      ...this.state,
      currentTime: status.currentTime,
      duration: status.duration || this.state.duration,
    };
    this.notify();
  }

  // ──── Cleanup ────

  private releasePlayer() {
    if (this.statusSubscription) {
      this.statusSubscription.remove();
      this.statusSubscription = null;
    }
    if (this.player) {
      this.player.pause();
      this.player.remove();
      this.player = null;
    }
    this.isSeeking = false;
  }

  destroy() {
    this.releasePlayer();
    this.listeners.clear();
    this.loopListeners.clear();
  }
}

// Singleton
export const audioEngine = new AudioEngine();
