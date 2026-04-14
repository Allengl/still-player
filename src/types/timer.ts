export type TimerMode = 'none' | 'countdown' | 'loop-counter';
export type TimerState =
  | 'inactive'
  | 'countdown-running'
  | 'counter-running'
  | 'fading-out'
  | 'stopped';

export interface TimerConfig {
  mode: TimerMode;
  countdownMinutes: number;
  loopTarget: number;
}

export interface TimerContext {
  state: TimerState;
  config: TimerConfig;
  countdownRemaining: number;
  loopsCounted: number;
  fadeProgress: number;
}
