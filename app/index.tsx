import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioEngine, audioEngine } from '../src/engine/useAudioEngine';
import { useTimerManager } from '../src/hooks/useTimerManager';
import { WaveformView } from '../src/components/WaveformView';
import { TrackInfo } from '../src/components/TrackInfo';
import { ProgressBar } from '../src/components/ProgressBar';
import { TransportControls } from '../src/components/TransportControls';
import { ABControls } from '../src/components/ABControls';
import { TimerPanel } from '../src/components/TimerPanel';
import { theme } from '../src/constants/theme';

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const state = useAudioEngine();
  const timer = useTimerManager();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Waveform */}
        <WaveformView player={audioEngine.getPlayer()} />

        {/* Track info + big time */}
        <TrackInfo
          trackName={state.currentTrack?.name ?? null}
          currentTime={state.currentTime}
        />

        {/* Progress bar */}
        <ProgressBar
          currentTime={state.currentTime}
          duration={state.duration}
          abMarkers={state.abMarkers}
          onSeek={(sec) => audioEngine.seekTo(sec)}
        />

        {/* Transport */}
        <TransportControls
          playbackState={state.playbackState}
          onPlay={() => audioEngine.play()}
          onPause={() => audioEngine.pause()}
          onStop={() => audioEngine.stop()}
        />

        {/* A-B Controls */}
        <ABControls
          abMarkers={state.abMarkers}
          onMarkA={() => audioEngine.markA()}
          onMarkB={() => audioEngine.markB()}
          onClear={() => audioEngine.clearAB()}
          onAdjustA={(d) => audioEngine.adjustA(d)}
          onAdjustB={(d) => audioEngine.adjustB(d)}
        />

        {/* Timer */}
        <TimerPanel
          timerState={timer.state}
          countdownRemaining={timer.countdownRemaining}
          loopsCounted={timer.loopsCounted}
          loopTarget={timer.config.loopTarget}
          fadeProgress={timer.fadeProgress}
          onStartCountdown={timer.startCountdown}
          onStartLoopCounter={timer.startLoopCounter}
          onCancel={timer.cancelTimer}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
});
