import React from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import { theme } from '../constants/theme';
import { formatTime } from '../utils/formatTime';
import type { ABMarkers } from '../types/audio';

interface Props {
  currentTime: number;
  duration: number;
  abMarkers: ABMarkers;
  onSeek: (seconds: number) => void;
}

export function ProgressBar({ currentTime, duration, abMarkers, onSeek }: Props) {
  const [barWidth, setBarWidth] = React.useState(0);
  const progress = duration > 0 ? currentTime / duration : 0;

  const markerAPos =
    abMarkers.pointA !== null && duration > 0
      ? (abMarkers.pointA / duration) * barWidth
      : null;
  const markerBPos =
    abMarkers.pointB !== null && duration > 0
      ? (abMarkers.pointB / duration) * barWidth
      : null;

  const handleLayout = (e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  const handlePress = (e: { nativeEvent: { locationX: number } }) => {
    if (barWidth <= 0 || duration <= 0) return;
    const fraction = Math.max(0, Math.min(1, e.nativeEvent.locationX / barWidth));
    onSeek(fraction * duration);
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePress} style={styles.barContainer} onLayout={handleLayout}>
        {/* Track background */}
        <View style={styles.track} />

        {/* A-B region highlight */}
        {markerAPos !== null && markerBPos !== null && (
          <View
            style={[
              styles.abRegion,
              { left: markerAPos, width: markerBPos - markerAPos },
            ]}
          />
        )}

        {/* Filled progress */}
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />

        {/* A marker */}
        {markerAPos !== null && (
          <View style={[styles.marker, styles.markerA, { left: markerAPos - 1 }]} />
        )}

        {/* B marker */}
        {markerBPos !== null && (
          <View style={[styles.marker, styles.markerB, { left: markerBPos - 1 }]} />
        )}
      </Pressable>

      {/* Time labels */}
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: theme.spacing.md,
  },
  barContainer: {
    height: 32,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.progressTrack,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.progressFill,
  },
  abRegion: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.abRegion,
  },
  marker: {
    position: 'absolute',
    width: 2,
    height: 16,
    top: 8,
    borderRadius: 1,
  },
  markerA: {
    backgroundColor: theme.colors.markerA,
  },
  markerB: {
    backgroundColor: theme.colors.markerB,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  timeText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontVariant: ['tabular-nums'],
  },
});
