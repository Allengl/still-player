import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { theme } from "../constants/theme";
import { FINE_TUNE_STEP } from "../constants/config";
import { formatTime } from "../utils/formatTime";
import type { ABMarkers } from "../types/audio";

interface Props {
    abMarkers: ABMarkers;
    onMarkA: () => void;
    onMarkB: () => void;
    onClearA: () => void; // clears A (and B, since B depends on A)
    onClearB: () => void; // clears B only, keeps A
    onAdjustA: (delta: number) => void;
    onAdjustB: (delta: number) => void;
}

export function ABControls({
    abMarkers,
    onMarkA,
    onMarkB,
    onClearA,
    onClearB,
    onAdjustA,
    onAdjustB,
}: Props) {
    const { state, pointA, pointB } = abMarkers;

    const aIsSet = state === "a-set" || state === "ab-looping";
    const bIsSet = state === "ab-looping";

    // A button: set A when not set, clear A (+ B) when already set
    const handlePressA = () => {
        if (aIsSet) {
            onClearA();
        } else {
            onMarkA();
        }
    };

    // B button: set B when A is set but B isn't, clear B only when B is set
    const handlePressB = () => {
        if (bIsSet) {
            onClearB();
        } else if (state === "a-set") {
            onMarkB();
        }
    };

    return (
        <View style={styles.container}>
            {/* ── Marker buttons row ── */}
            <View style={styles.row}>
                {/* A button */}
                <Pressable
                    style={[
                        styles.markerButton,
                        aIsSet && styles.markerButtonAActive,
                    ]}
                    onPress={handlePressA}
                >
                    <Text
                        style={[
                            styles.markerLabel,
                            {
                                color: aIsSet
                                    ? theme.colors.markerA
                                    : theme.colors.textSecondary,
                            },
                        ]}
                    >
                        {aIsSet ? `A  ${formatTime(pointA ?? 0)}` : "A"}
                    </Text>
                    {aIsSet && (
                        <View style={styles.clearBadge}>
                            <X size={10} color={theme.colors.markerA} />
                        </View>
                    )}
                </Pressable>

                {/* B button */}
                <Pressable
                    style={[
                        styles.markerButton,
                        bIsSet && styles.markerButtonBActive,
                        !aIsSet && styles.markerButtonDisabled,
                    ]}
                    onPress={handlePressB}
                    disabled={!aIsSet}
                >
                    <Text
                        style={[
                            styles.markerLabel,
                            {
                                color: bIsSet
                                    ? theme.colors.markerB
                                    : aIsSet
                                      ? theme.colors.textSecondary
                                      : theme.colors.textMuted,
                            },
                        ]}
                    >
                        {bIsSet ? `B  ${formatTime(pointB ?? 0)}` : "B"}
                    </Text>
                    {bIsSet && (
                        <View style={styles.clearBadge}>
                            <X size={10} color={theme.colors.markerB} />
                        </View>
                    )}
                </Pressable>
            </View>

            {/* ── Fine-tune row (shown once at least A is placed) ── */}
            {aIsSet && (
                <View style={styles.row}>
                    {/* A fine-tune */}
                    <View style={styles.fineGroup}>
                        <Text
                            style={[
                                styles.fineLabel,
                                { color: theme.colors.markerA },
                            ]}
                        >
                            A
                        </Text>
                        <Pressable
                            style={styles.fineButton}
                            onPress={() => onAdjustA(-FINE_TUNE_STEP)}
                        >
                            <ChevronLeft
                                size={16}
                                color={theme.colors.markerA}
                            />
                        </Pressable>
                        <Pressable
                            style={styles.fineButton}
                            onPress={() => onAdjustA(FINE_TUNE_STEP)}
                        >
                            <ChevronRight
                                size={16}
                                color={theme.colors.markerA}
                            />
                        </Pressable>
                    </View>

                    {/* B fine-tune — only when B is also set */}
                    {bIsSet && (
                        <View style={styles.fineGroup}>
                            <Text
                                style={[
                                    styles.fineLabel,
                                    { color: theme.colors.markerB },
                                ]}
                            >
                                B
                            </Text>
                            <Pressable
                                style={styles.fineButton}
                                onPress={() => onAdjustB(-FINE_TUNE_STEP)}
                            >
                                <ChevronLeft
                                    size={16}
                                    color={theme.colors.markerB}
                                />
                            </Pressable>
                            <Pressable
                                style={styles.fineButton}
                                onPress={() => onAdjustB(FINE_TUNE_STEP)}
                            >
                                <ChevronRight
                                    size={16}
                                    color={theme.colors.markerB}
                                />
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.sm,
    },

    // ── Marker buttons ────────────────────────────────────────────────────────
    markerButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md, // larger tap target
        paddingHorizontal: theme.spacing.lg, // comfortable horizontal padding
        minHeight: 56, // ensure a decent minimum height
        borderRadius: theme.borderRadius.lg, // slightly larger radius for the bigger button
    },
    markerButtonAActive: {
        borderColor: theme.colors.markerA,
        backgroundColor: "rgba(0, 212, 255, 0.08)",
    },
    markerButtonBActive: {
        borderColor: theme.colors.markerB,
        backgroundColor: "rgba(255, 107, 53, 0.08)",
    },
    markerButtonDisabled: {
        opacity: 0.4,
    },

    markerLabel: {
        fontSize: theme.fontSize.lg,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
    },

    // small ✕ badge shown inside the button when the marker is set
    clearBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
    },

    // ── Fine-tune controls ────────────────────────────────────────────────────
    fineGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
    },
    fineLabel: {
        fontSize: theme.fontSize.sm,
        fontWeight: "600",
        width: 14,
        textAlign: "center",
    },
    fineButton: {
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.surface,
    },
});
