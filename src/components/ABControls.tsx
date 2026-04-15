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

    // ── Single cycling handler ────────────────────────────────────────────────
    // tap 1 (unmarked)   → set A
    // tap 2 (a-set)      → set B  →  loop becomes active
    // tap 3 (ab-looping) → clear  →  back to unmarked
    const handleCycle = () => {
        switch (state) {
            case "unmarked":
                onMarkA();
                break;
            case "a-set":
                onMarkB();
                break;
            case "ab-looping":
                onClear();
                break;
        }
    };

    // ── Button content per state ──────────────────────────────────────────────
    const renderButtonContent = () => {
        switch (state) {
            case "unmarked":
                return (
                    <View style={styles.btnInner}>
                        <Text style={styles.btnLabelIdle}>AB</Text>
                        <Text style={styles.btnHint}>点击设置区间</Text>
                    </View>
                );

            case "a-set":
                return (
                    <View style={styles.btnInner}>
                        <View style={styles.btnTimesRow}>
                            <Text
                                style={[
                                    styles.btnTime,
                                    { color: theme.colors.markerA },
                                ]}
                            >
                                A {formatTime(pointA ?? 0)}
                            </Text>
                            <Text style={styles.btnArrow}>→</Text>
                            <Text style={styles.btnTimePlaceholder}>?</Text>
                        </View>
                        <Text style={styles.btnHint}>点击设置终点</Text>
                    </View>
                );

            case "ab-looping":
                return (
                    <View style={styles.btnInner}>
                        <View style={styles.btnTimesRow}>
                            <Text
                                style={[
                                    styles.btnTime,
                                    { color: theme.colors.markerA },
                                ]}
                            >
                                A {formatTime(pointA ?? 0)}
                            </Text>
                            <Text style={styles.btnArrow}>↔</Text>
                            <Text
                                style={[
                                    styles.btnTime,
                                    { color: theme.colors.markerB },
                                ]}
                            >
                                B {formatTime(pointB ?? 0)}
                            </Text>
                        </View>
                        <Text style={styles.btnHint}>点击取消区间</Text>
                    </View>
                );
        }
    };

    // ── Button style per state ────────────────────────────────────────────────
    const mainButtonStyle = [
        styles.mainButton,
        state === "a-set" && styles.mainButtonASet,
        state === "ab-looping" && styles.mainButtonLooping,
    ];

    return (
        <View style={styles.container}>
            {/* ── Main cycling button row ── */}
            <View style={styles.row}>
                <Pressable style={mainButtonStyle} onPress={handleCycle}>
                    {renderButtonContent()}
                </Pressable>

                {/* X shortcut: visible whenever a marker has been placed */}
                {state !== "unmarked" && (
                    <Pressable style={styles.clearButton} onPress={onClear}>
                        <X size={18} color={theme.colors.danger} />
                    </Pressable>
                )}
            </View>

            {/* ── Fine-tune row (shown once at least A is placed) ── */}
            {state !== "unmarked" && (
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

                    {/* B fine-tune — only when both markers are set */}
                    {state === "ab-looping" && (
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

    // ── Main cycling button ───────────────────────────────────────────────────
    mainButton: {
        flex: 1,
        paddingVertical: theme.spacing.sm + 2,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.surfaceLight,
        backgroundColor: theme.colors.surface,
        alignItems: "center",
    },
    mainButtonASet: {
        borderColor: theme.colors.markerA,
        backgroundColor: "rgba(0, 212, 255, 0.06)",
    },
    mainButtonLooping: {
        borderColor: theme.colors.markerB,
        backgroundColor: "rgba(255, 107, 53, 0.08)",
    },

    // button interior layout
    btnInner: {
        alignItems: "center",
        gap: 2,
    },
    btnTimesRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
    },
    btnLabelIdle: {
        fontSize: theme.fontSize.md,
        fontWeight: "700",
        color: theme.colors.textSecondary,
        letterSpacing: 2,
    },
    btnTime: {
        fontSize: theme.fontSize.md,
        fontWeight: "600",
        fontVariant: ["tabular-nums"],
    },
    btnTimePlaceholder: {
        fontSize: theme.fontSize.md,
        fontWeight: "600",
        color: theme.colors.textMuted,
    },
    btnArrow: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textMuted,
    },
    btnHint: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textMuted,
        marginTop: 1,
    },

    // ── Clear (X) shortcut button ─────────────────────────────────────────────
    clearButton: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.surfaceLight,
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
