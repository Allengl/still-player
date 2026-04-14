import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { FolderOpen } from "lucide-react-native";
import { useAudioEngine, audioEngine } from "../src/engine/useAudioEngine";
import { getTracks } from "../src/services/StorageService";
import { importAudioFile, deleteAudioFile } from "../src/services/FileManager";
import { FileListItem } from "../src/components/FileListItem";
import { theme } from "../src/constants/theme";
import type { AudioTrack } from "../src/types/audio";

export default function LibraryScreen() {
    const insets = useSafeAreaInsets();
    const state = useAudioEngine();
    const [tracks, setTracks] = useState<AudioTrack[]>([]);

    const loadTracks = useCallback(async () => {
        const list = await getTracks();
        setTracks(list);
    }, []);

    useEffect(() => {
        loadTracks();
    }, [loadTracks]);

    const handleImport = async () => {
        const track = await importAudioFile();
        if (track) {
            await loadTracks();
        }
    };

    const handleDelete = async (track: AudioTrack) => {
        await deleteAudioFile(track);
        await loadTracks();
    };

    const handleSelect = (track: AudioTrack) => {
        audioEngine.loadTrack(track);
        router.navigate("/");
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.title}>Library</Text>
                <Pressable style={styles.importBtn} onPress={handleImport}>
                    <FolderOpen size={18} color={theme.colors.primary} />
                    <Text style={styles.importText}>Import</Text>
                </Pressable>
            </View>

            <FlatList
                data={tracks}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <FileListItem
                        track={item}
                        isActive={state.currentTrack?.id === item.id}
                        onPress={() => handleSelect(item)}
                        onDelete={() => handleDelete(item)}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <FolderOpen size={48} color={theme.colors.textMuted} />
                        <Text style={styles.emptyText}>No audio files</Text>
                        <Text style={styles.emptyHint}>
                            Tap "Import" to add .mp3 or .wav files
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: theme.colors.surfaceLight,
    },
    title: {
        color: theme.colors.textPrimary,
        fontSize: theme.fontSize.xl,
        fontWeight: "700",
    },
    importBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    importText: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.md,
        fontWeight: "600",
    },
    empty: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 120,
        gap: theme.spacing.sm,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.lg,
    },
    emptyHint: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.sm,
    },
});
