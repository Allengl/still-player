import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

interface Props {
  playbackRate: number;
  onRateChange: (rate: number) => void;
  disabled?: boolean;
}

export function SpeedControl({ playbackRate, onRateChange, disabled = false }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Speed</Text>
      <View style={styles.row}>
        {SPEED_PRESETS.map((rate) => {
          const isActive = Math.abs(playbackRate - rate) < 0.01;
          return (
            <Pressable
              key={rate}
              style={[
                styles.button,
                isActive && styles.buttonActive,
                disabled && styles.disabled,
              ]}
              onPress={() => onRateChange(rate)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.buttonText,
                  isActive && styles.buttonTextActive,
                  disabled && styles.buttonTextDisabled,
                ]}
              >
                {rate === 1.0 ? '1×' : `${rate}×`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  button: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    backgroundColor: theme.colors.surface,
    minWidth: 52,
    alignItems: 'center',
  },
  buttonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
  },
  disabled: {
    opacity: 0.35,
  },
  buttonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  buttonTextActive: {
    color: theme.colors.primary,
  },
  buttonTextDisabled: {
    color: theme.colors.textMuted,
  },
});
