import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AudioTrack } from "../types/audio";

const TRACKS_KEY = "still_tracks";

export async function getTracks(): Promise<AudioTrack[]> {
    const raw = await AsyncStorage.getItem(TRACKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AudioTrack[];
}

export async function saveTracks(tracks: AudioTrack[]): Promise<void> {
    await AsyncStorage.setItem(TRACKS_KEY, JSON.stringify(tracks));
}

export async function addTrack(track: AudioTrack): Promise<void> {
    const tracks = await getTracks();
    tracks.push(track);
    await saveTracks(tracks);
}

export async function removeTrack(id: string): Promise<void> {
    const tracks = await getTracks();
    await saveTracks(tracks.filter((t) => t.id !== id));
}
