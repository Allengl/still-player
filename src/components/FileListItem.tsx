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
}

export function FileListItem({ track, isActive, onPress, onDelete }: Props) {
    const sizeKb = Math.round(track.sizeBytes / 1024);
    const sizeLabel =
        sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

    return (
        <View style={[styles.container, isActive && styles.active]}>
            {/* Main tappable area — does NOT wrap the delete button */}
            <Pressable
                style={({ pressed }) => [
                    styles.mainContent,
                    pressed && styles.pressed,
                ]}
                onPress={onPress}
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
            </Pressable>

            {/* Delete button lives outside the main Pressable to prevent
                event-bubbling issues on web where a nested Pressable click
                would also fire the parent's onPress handler. */}
            <Pressable
                style={({ pressed }) => [
                    styles.deleteBtn,
                    pressed && styles.deleteBtnPressed,
                ]}
                onPress={onDelete}
                hitSlop={8}
            >
                <Trash2 size={18} color={theme.colors.danger} />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.surfaceLight,
    },
    active: {
        backgroundColor: "rgba(0, 212, 255, 0.05)",
    },
    mainContent: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
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
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        marginRight: theme.spacing.xs,
    },
    deleteBtnPressed: {
        opacity: 0.6,
    },
});
