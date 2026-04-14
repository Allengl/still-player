import React, { useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import type { AudioPlayer, AudioSample } from 'expo-audio';
import { theme } from '../constants/theme';

interface Props {
  player: AudioPlayer | null;
}

const BAR_COUNT = 40;
const BAR_WIDTH = 3;
const BAR_GAP = 2;

export function WaveformView({ player }: Props) {
  const barsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));
  const [bars, setBars] = React.useState<number[]>(new Array(BAR_COUNT).fill(0));

  useEffect(() => {
    if (!player) {
      setBars(new Array(BAR_COUNT).fill(0));
      return;
    }

    const listener = (sample: AudioSample) => {
      if (!sample.channels.length || !sample.channels[0].frames.length) return;

      const frames = sample.channels[0].frames;
      const chunkSize = Math.max(1, Math.floor(frames.length / BAR_COUNT));
      const newBars: number[] = [];

      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0;
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, frames.length);
        for (let j = start; j < end; j++) {
          sum += Math.abs(frames[j]);
        }
        newBars.push(sum / (end - start));
      }

      barsRef.current = newBars;
      setBars(newBars);
    };

    const subscription = player.addListener('audioSampleUpdate', listener);
    try {
      player.setAudioSamplingEnabled(true);
    } catch {
      // Sampling may not be supported on all platforms
    }

    return () => {
      subscription.remove();
      try {
        player.setAudioSamplingEnabled(false);
      } catch {
        // Player may already be released
      }
    };
  }, [player]);

  return (
    <View style={styles.container}>
      {bars.map((level, i) => {
        const height = Math.max(2, level * 60);
        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height,
                backgroundColor:
                  level > 0.01 ? theme.colors.primary : theme.colors.surfaceLight,
                opacity: 0.3 + level * 0.7,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    gap: BAR_GAP,
    paddingHorizontal: theme.spacing.md,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: BAR_WIDTH / 2,
    minHeight: 2,
  },
});
