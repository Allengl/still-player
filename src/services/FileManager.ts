import { Platform } from "react-native";
import { getDocumentAsync } from "expo-document-picker";
import {
    documentDirectory,
    makeDirectoryAsync,
    copyAsync,
    deleteAsync,
    getInfoAsync,
} from "expo-file-system/legacy";
import type { AudioTrack } from "../types/audio";
import { addTrack, removeTrack as removeTrackMeta } from "./StorageService";

const AUDIO_DIR = `${documentDirectory}audio/`;

async function ensureAudioDir(): Promise<void> {
    if (Platform.OS === "web") return;
    const info = await getInfoAsync(AUDIO_DIR);
    if (!info.exists) {
        await makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
    }
}

export async function importAudioFile(): Promise<AudioTrack | null> {
    const result = await getDocumentAsync({
        type: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp3"],
        copyToCacheDirectory: true,
        multiple: false,
    });

    if (result.canceled || !result.assets?.length) return null;

    const asset = result.assets[0];
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // ── Web: use the blob URL returned by the document picker directly.
    // No file-system copy is needed; the blob URL is valid for the session.
    if (Platform.OS === "web") {
        const track: AudioTrack = {
            id,
            name: asset.name.replace(/\.[^.]+$/, ""),
            uri: asset.uri,
            fileName: asset.name,
            sizeBytes: asset.size ?? 0,
            importedAt: Date.now(),
        };
        await addTrack(track);
        return track;
    }

    // ── Native: copy the file into the app's private audio directory so it
    // persists independently of the cache and the original pick location.
    const ext = asset.name.includes(".")
        ? asset.name.slice(asset.name.lastIndexOf("."))
        : ".mp3";
    const destFileName = `${id}${ext}`;

    await ensureAudioDir();
    const destUri = `${AUDIO_DIR}${destFileName}`;
    await copyAsync({ from: asset.uri, to: destUri });

    const track: AudioTrack = {
        id,
        name: asset.name.replace(/\.[^.]+$/, ""),
        uri: destUri,
        fileName: destFileName,
        sizeBytes: asset.size ?? 0,
        importedAt: Date.now(),
    };

    await addTrack(track);
    return track;
}

export async function deleteAudioFile(track: AudioTrack): Promise<void> {
    // ── Web: revoke the blob URL to release the memory reference, then remove
    // the track metadata from storage.
    if (Platform.OS === "web") {
        if (track.uri.startsWith("blob:")) {
            URL.revokeObjectURL(track.uri);
        }
        await removeTrackMeta(track.id);
        return;
    }

    // ── Native: delete the physical file first, then clean up metadata.
    try {
        const info = await getInfoAsync(track.uri);
        if (info.exists) {
            await deleteAsync(track.uri);
        }
    } catch {
        // File may have been deleted externally — carry on to remove metadata.
    }
    await removeTrackMeta(track.id);
}
