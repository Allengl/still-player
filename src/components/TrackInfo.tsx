import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Music } from 'lucide-react-native';
import { theme } from '../constants/theme';
import { formatTime } from '../utils/formatTime';

interface Props {
  trackName: string | null;
  currentTime: number;
}

export function TrackInfo({ trackName, currentTime }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.nameRow}>
        <Music size={14} color={theme.colors.textSecondary} />
        <Text style={styles.name} numberOfLines={1}>
          {trackName ?? 'No track selected'}
        </Text>
      </View>
      <Text style={styles.time}>{formatTime(currentTime)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  name: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    maxWidth: 280,
  },
  time: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.xxl,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
});
