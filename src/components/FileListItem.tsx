import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Trash2, Music } from "lucide-react-native";
import { theme } from "../constants/theme";
import type { AudioTrack } from "../types/audio";

interface Props {
    track: AudioTrack;
    isActive: boolean;
    onPress: () => void;
    onDelete: () => void;
    onDoublePress?: () => void;
}

const DOUBLE_PRESS_DELAY = 300; // ms

export function FileListItem({
    track,
    isActive,
    onPress,
    onDelete,
    onDoublePress,
}: Props) {
    const sizeKb = Math.round(track.sizeBytes / 1024);
    const sizeLabel =
        sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

    const lastPressTimeRef = React.useRef<number>(0);

    const handlePress = () => {
        // Always fire single-press immediately (no delay)
        onPress();

        if (!onDoublePress) return;

        const now = Date.now();
        if (now - lastPressTimeRef.current < DOUBLE_PRESS_DELAY) {
            // Second tap within the window — it's a double press
            lastPressTimeRef.current = 0;
            onDoublePress();
        } else {
            lastPressTimeRef.current = now;
        }
    };

    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                isActive && styles.active,
                pressed && styles.pressed,
            ]}
            onPress={handlePress}
        >
            <View style={styles.icon}>
                <Music
                    size={20}
                    color={
                        isActive
                            ? theme.colors.primary
                            : theme.colors.textSecondary
                    }
                />
            </View>
            <View style={styles.info}>
                <Text
                    style={[styles.name, isActive && styles.nameActive]}
                    numberOfLines={1}
                >
                    {track.name}
                </Text>
                <Text style={styles.meta}>{sizeLabel}</Text>
            </View>
            <Pressable style={styles.deleteBtn} onPress={onDelete} hitSlop={8}>
                <Trash2 size={18} color={theme.colors.danger} />
            </Pressable>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.surfaceLight,
    },
    active: {
        backgroundColor: "rgba(0, 212, 255, 0.05)",
    },
    pressed: {
        backgroundColor: "rgba(255, 255, 255, 0.04)",
    },
    icon: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    info: {
        flex: 1,
        gap: 2,
    },
    name: {
        color: theme.colors.textPrimary,
        fontSize: theme.fontSize.md,
    },
    nameActive: {
        color: theme.colors.primary,
    },
    meta: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.xs,
    },
    deleteBtn: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
    },
});
