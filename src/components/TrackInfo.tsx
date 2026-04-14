import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Music } from "lucide-react-native";
import { theme } from "../constants/theme";
import { formatTime } from "../utils/formatTime";

interface Props {
    trackName: string | null;
    currentTime: number;
    onPress?: () => void;
}

export function TrackInfo({ trackName, currentTime, onPress }: Props) {
    return (
        <View style={styles.container}>
            <Pressable
                style={({ pressed }) => [
                    styles.nameRow,
                    onPress && styles.nameRowTappable,
                    onPress && pressed && styles.nameRowPressed,
                ]}
                onPress={onPress}
                disabled={!onPress}
            >
                <Music size={14} color={theme.colors.textSecondary} />
                <Text style={styles.name} numberOfLines={1}>
                    {trackName ?? "No track selected"}
                </Text>
            </Pressable>
            <Text style={styles.time}>{formatTime(currentTime)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
    },
    nameRowTappable: {
        borderWidth: 1,
        borderColor: theme.colors.surfaceLight,
        backgroundColor: theme.colors.surface,
    },
    nameRowPressed: {
        borderColor: theme.colors.primary,
        backgroundColor: "rgba(0, 212, 255, 0.08)",
    },
    name: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.md,
        maxWidth: 280,
    },
    time: {
        color: theme.colors.textPrimary,
        fontSize: theme.fontSize.xxl,
        fontWeight: "200",
        fontVariant: ["tabular-nums"],
        letterSpacing: 2,
    },
});
