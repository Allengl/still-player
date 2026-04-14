import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Trash2, Music, Check, X } from "lucide-react-native";
import { theme } from "../constants/theme";
import type { AudioTrack } from "../types/audio";

interface Props {
    track: AudioTrack;
    isActive: boolean;
    onPress: () => void;
    onDelete: () => void;
}

export function FileListItem({ track, isActive, onPress, onDelete }: Props) {
    const [confirming, setConfirming] = React.useState(false);

    const sizeKb = Math.round(track.sizeBytes / 1024);
    const sizeLabel =
        sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

    const handleDeletePress = () => setConfirming(true);
    const handleCancel = () => setConfirming(false);
    const handleConfirm = () => {
        setConfirming(false);
        onDelete();
    };

    return (
        <View style={[styles.container, isActive && styles.active]}>
            {/* Main tappable area */}
            <Pressable
                style={({ pressed }) => [
                    styles.mainContent,
                    !confirming && pressed && styles.pressed,
                ]}
                onPress={confirming ? handleCancel : onPress}
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

            {/* Right-side action area */}
            {confirming ? (
                /* Inline confirm: Delete / Cancel */
                <View style={styles.confirmRow}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.confirmBtn,
                            pressed && styles.confirmBtnPressed,
                        ]}
                        onPress={handleConfirm}
                    >
                        <Check size={14} color={theme.colors.background} />
                        <Text style={styles.confirmBtnText}>Delete</Text>
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [
                            styles.cancelBtn,
                            pressed && styles.cancelBtnPressed,
                        ]}
                        onPress={handleCancel}
                    >
                        <X size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                </View>
            ) : (
                /* Trash icon */
                <Pressable
                    style={({ pressed }) => [
                        styles.deleteBtn,
                        pressed && styles.deleteBtnPressed,
                    ]}
                    onPress={handleDeletePress}
                    hitSlop={8}
                >
                    <Trash2 size={18} color={theme.colors.danger} />
                </Pressable>
            )}
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

    /* Trash icon button */
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

    /* Inline confirm row */
    confirmRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        paddingRight: theme.spacing.sm,
    },
    confirmBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: theme.colors.danger,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    confirmBtnPressed: {
        opacity: 0.75,
    },
    confirmBtnText: {
        color: theme.colors.background,
        fontSize: theme.fontSize.sm,
        fontWeight: "600",
    },
    cancelBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.surfaceLight,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    cancelBtnPressed: {
        opacity: 0.75,
    },
    cancelBtnText: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.sm,
        fontWeight: "600",
    },
});
