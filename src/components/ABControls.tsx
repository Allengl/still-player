import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { theme } from '../constants/theme';
import { FINE_TUNE_STEP } from '../constants/config';
import { formatTime } from '../utils/formatTime';
import type { ABMarkers } from '../types/audio';

interface Props {
  abMarkers: ABMarkers;
  onMarkA: () => void;
  onMarkB: () => void;
  onClear: () => void;
  onAdjustA: (delta: number) => void;
  onAdjustB: (delta: number) => void;
}

export function ABControls({
  abMarkers,
  onMarkA,
  onMarkB,
  onClear,
  onAdjustA,
  onAdjustB,
}: Props) {
  const { state, pointA, pointB } = abMarkers;

  return (
    <View style={styles.container}>
      {/* Top row: Mark A / Mark B / Clear */}
      <View style={styles.row}>
        <Pressable
          style={[
            styles.markButton,
            state !== 'unmarked' && styles.markButtonActive,
          ]}
          onPress={onMarkA}
          disabled={state === 'ab-looping'}
        >
          <Text
            style={[
              styles.markText,
              { color: state !== 'unmarked' ? theme.colors.markerA : theme.colors.textPrimary },
            ]}
          >
            {state === 'unmarked' ? 'Mark A' : `A ${formatTime(pointA ?? 0)}`}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.markButton,
            state === 'ab-looping' && styles.markButtonActive,
          ]}
          onPress={onMarkB}
          disabled={state !== 'a-set'}
        >
          <Text
            style={[
              styles.markText,
              {
                color:
                  state === 'ab-looping'
                    ? theme.colors.markerB
                    : state === 'a-set'
                    ? theme.colors.textPrimary
                    : theme.colors.textMuted,
              },
            ]}
          >
            {state === 'ab-looping' ? `B ${formatTime(pointB ?? 0)}` : 'Mark B'}
          </Text>
        </Pressable>

        {state !== 'unmarked' && (
          <Pressable style={styles.clearButton} onPress={onClear}>
            <X size={18} color={theme.colors.danger} />
          </Pressable>
        )}
      </View>

      {/* Fine-tune row */}
      {state !== 'unmarked' && (
        <View style={styles.row}>
          {/* A fine-tune */}
          <View style={styles.fineGroup}>
            <Text style={styles.fineLabel}>A</Text>
            <Pressable
              style={styles.fineButton}
              onPress={() => onAdjustA(-FINE_TUNE_STEP)}
            >
              <ChevronLeft size={16} color={theme.colors.markerA} />
            </Pressable>
            <Pressable
              style={styles.fineButton}
              onPress={() => onAdjustA(FINE_TUNE_STEP)}
            >
              <ChevronRight size={16} color={theme.colors.markerA} />
            </Pressable>
          </View>

          {/* B fine-tune (only when AB set) */}
          {state === 'ab-looping' && (
            <View style={styles.fineGroup}>
              <Text style={styles.fineLabel}>B</Text>
              <Pressable
                style={styles.fineButton}
                onPress={() => onAdjustB(-FINE_TUNE_STEP)}
              >
                <ChevronLeft size={16} color={theme.colors.markerB} />
              </Pressable>
              <Pressable
                style={styles.fineButton}
                onPress={() => onAdjustB(FINE_TUNE_STEP)}
              >
                <ChevronRight size={16} color={theme.colors.markerB} />
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  markButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    backgroundColor: theme.colors.surface,
  },
  markButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
  },
  markText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  clearButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
  },
  fineGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  fineLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    width: 14,
    textAlign: 'center',
  },
  fineButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
  },
});
