import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Play, Pause, Square } from 'lucide-react-native';
import { theme } from '../constants/theme';
import type { PlaybackState } from '../types/audio';

interface Props {
  playbackState: PlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

export function TransportControls({ playbackState, onPlay, onPause, onStop }: Props) {
  const isPlaying = playbackState === 'playing';
  const canStop = playbackState === 'playing' || playbackState === 'paused';

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, !canStop && styles.disabled]}
        onPress={onStop}
        disabled={!canStop}
      >
        <Square
          size={24}
          color={canStop ? theme.colors.textPrimary : theme.colors.textMuted}
          fill={canStop ? theme.colors.textPrimary : theme.colors.textMuted}
        />
      </Pressable>

      <Pressable
        style={[styles.playButton]}
        onPress={isPlaying ? onPause : onPlay}
        disabled={playbackState === 'idle' || playbackState === 'loading'}
      >
        {isPlaying ? (
          <Pause size={36} color={theme.colors.background} fill={theme.colors.background} />
        ) : (
          <Play size={36} color={theme.colors.background} fill={theme.colors.background} />
        )}
      </Pressable>

      {/* Spacer to keep play button centered */}
      <View style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xl,
  },
  button: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.3,
  },
});
