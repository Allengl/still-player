import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { Clock, Repeat, X } from 'lucide-react-native';
import { theme } from '../constants/theme';
import { formatTimeFull } from '../utils/formatTime';
import type { TimerState } from '../types/timer';

interface Props {
  timerState: TimerState;
  countdownRemaining: number;
  loopsCounted: number;
  loopTarget: number;
  fadeProgress: number;
  onStartCountdown: (minutes: number) => void;
  onStartLoopCounter: (target: number) => void;
  onCancel: () => void;
}

export function TimerPanel({
  timerState,
  countdownRemaining,
  loopsCounted,
  loopTarget,
  fadeProgress,
  onStartCountdown,
  onStartLoopCounter,
  onCancel,
}: Props) {
  const [minutesInput, setMinutesInput] = useState('5');
  const [loopsInput, setLoopsInput] = useState('10');
  const isActive = timerState !== 'inactive' && timerState !== 'stopped';

  if (isActive) {
    return (
      <View style={styles.container}>
        <View style={styles.activeRow}>
          {timerState === 'countdown-running' && (
            <>
              <Clock size={16} color={theme.colors.primary} />
              <Text style={styles.activeText}>
                {formatTimeFull(countdownRemaining)}
              </Text>
            </>
          )}
          {timerState === 'counter-running' && (
            <>
              <Repeat size={16} color={theme.colors.primary} />
              <Text style={styles.activeText}>
                {loopsCounted} / {loopTarget}
              </Text>
            </>
          )}
          {timerState === 'fading-out' && (
            <Text style={styles.fadingText}>
              Fading out... {Math.round(fadeProgress * 100)}%
            </Text>
          )}
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <X size={16} color={theme.colors.danger} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Countdown */}
        <View style={styles.inputGroup}>
          <Clock size={14} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.input}
            value={minutesInput}
            onChangeText={setMinutesInput}
            keyboardType="numeric"
            placeholderTextColor={theme.colors.textMuted}
            maxLength={3}
          />
          <Text style={styles.unit}>min</Text>
          <Pressable
            style={styles.startButton}
            onPress={() => {
              const mins = parseFloat(minutesInput);
              if (mins > 0) onStartCountdown(mins);
            }}
          >
            <Text style={styles.startText}>Start</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.row}>
        {/* Loop counter */}
        <View style={styles.inputGroup}>
          <Repeat size={14} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.input}
            value={loopsInput}
            onChangeText={setLoopsInput}
            keyboardType="numeric"
            placeholderTextColor={theme.colors.textMuted}
            maxLength={4}
          />
          <Text style={styles.unit}>loops</Text>
          <Pressable
            style={styles.startButton}
            onPress={() => {
              const n = parseInt(loopsInput, 10);
              if (n > 0) onStartLoopCounter(n);
            }}
          >
            <Text style={styles.startText}>Start</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  input: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    width: 48,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceLight,
    paddingVertical: 2,
  },
  unit: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  startButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceLight,
  },
  startText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  activeText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  fadingText: {
    color: theme.colors.secondary,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  cancelButton: {
    marginLeft: theme.spacing.sm,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.full,
  },
});
