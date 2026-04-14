<div align="center">
  <img src="assets/logo-still.png" width="120" alt="Still Logo" />
  <h1>Still</h1>
  <p>A focused audio player built for musicians and language learners</p>

  ![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react)
  ![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
  ![Platform](https://img.shields.io/badge/Platform-Android-3DDC84?logo=android)
  ![License](https://img.shields.io/badge/License-MIT-green)
</div>

---

## Overview

**Still** is a lightweight, offline-first audio player designed for deliberate practice. Whether you're learning a new instrument, studying pronunciation, or transcribing music, Still gives you precise control over every second of your audio.

No streaming. No subscriptions. Just your files and your focus.

---

## Screenshots

> Player screen with A-B loop controls, waveform, and transport

---

## Features

### 🎵 Audio Playback
- Play, pause, stop with clean transport controls
- Seek anywhere on the progress bar with a single tap
- Real-time waveform visualization
- Background playback — audio keeps playing when you switch apps
- Lock screen controls with track metadata

### 🔁 A-B Loop Repeat
- Set a start point **A** and end point **B** to loop any segment
- Fine-tune A and B markers frame-by-frame with `◀ ▶` buttons
- Visual markers on the progress bar so you always know where you are
- One-tap clear to release the loop

### ⏱ Practice Timer
- **Countdown mode** — set a duration in minutes; the audio fades out gracefully when time is up
- **Loop counter mode** — set a target number of A-B repetitions; Still counts every loop automatically and stops when you hit your goal

### 📁 Library
- Import any `.mp3` or `.wav` file from your device storage
- Files are copied into the app's private sandbox — no cloud required
- Swipe-to-delete or long-press to remove tracks
- Persisted across sessions via AsyncStorage

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React Native 0.81](https://reactnative.dev) + [Expo SDK 54](https://expo.dev) |
| Language | TypeScript 5.9 (strict) |
| Navigation | [Expo Router 6](https://expo.github.io/router) (file-based) |
| Audio | [expo-audio](https://docs.expo.dev/versions/latest/sdk/audio/) |
| File Import | [expo-document-picker](https://docs.expo.dev/versions/latest/sdk/document-picker/) |
| Storage | [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) + expo-file-system |
| State | `useSyncExternalStore` + custom `AudioEngine` singleton |
| Icons | [lucide-react-native](https://lucide.dev) |
| JS Engine | Hermes |
| Architecture | New Architecture (Fabric + TurboModules) |

---

## Project Structure

```
still/
├── app/                     # Expo Router screens
│   ├── _layout.tsx          # Root layout (tab navigator)
│   ├── index.tsx            # Player screen
│   └── library.tsx          # Library screen
├── src/
│   ├── engine/
│   │   ├── AudioEngine.ts       # Core playback engine (singleton class)
│   │   ├── AudioEngineContext.tsx
│   │   └── useAudioEngine.ts    # React hook for engine state
│   ├── components/
│   │   ├── WaveformView.tsx     # Real-time waveform
│   │   ├── ProgressBar.tsx      # Seekable progress bar with A-B markers
│   │   ├── TrackInfo.tsx        # Track name + current time display
│   │   ├── TransportControls.tsx
│   │   ├── ABControls.tsx       # A-B marker controls + fine-tune
│   │   ├── TimerPanel.tsx       # Countdown & loop counter UI
│   │   └── FileListItem.tsx     # Library list row
│   ├── hooks/
│   │   └── useTimerManager.ts   # Timer logic (countdown + loop counter)
│   ├── services/
│   │   ├── AudioEngine.ts
│   │   ├── FileManager.ts       # Import / delete audio files
│   │   └── StorageService.ts    # Persist track list
│   ├── constants/
│   │   ├── theme.ts             # Colors, spacing, typography
│   │   └── config.ts            # Fine-tune step size, etc.
│   ├── types/
│   │   ├── audio.ts
│   │   └── timer.ts
│   └── utils/
│       └── formatTime.ts
├── assets/
│   ├── logo-still.png
│   └── splash-icon.png
├── app.json                 # Expo config (name, icons, package id)
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Android Studio + Android SDK (API 24+)
- JDK 17
- For physical device: USB debugging enabled

### Install Dependencies

```bash
git clone https://github.com/Allengl/still-player.git
cd still-player
npm install
```

### Run on Android

```bash
# Generate native Android project (first time)
npx expo prebuild --platform android

# Run on a connected device or emulator
npm run android
```

### Build a Release APK

```bash
# Full build (all architectures)
cd android && ./gradlew assembleRelease

# arm64-v8a only (smaller size, modern devices)
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## Download

A pre-built release APK for **arm64-v8a** (modern Android phones, API 24+) is included in the repository:

📦 **[Still-1.0.0-arm64.apk](./Still-1.0.0-arm64.apk)** — 30 MB

Install directly on your device:
```bash
adb install Still-1.0.0-arm64.apk
```

---

## How It Works

### AudioEngine

`AudioEngine` is a plain TypeScript class that owns all playback state. It follows the `useSyncExternalStore` contract — React subscribes to it and re-renders only when state actually changes.

```
AudioEngine
  └── expo-audio AudioPlayer          ← native layer
  └── A-B loop enforcement            ← seekTo(pointA) on every status tick
  └── notifies all React subscribers  ← via useSyncExternalStore
```

### A-B Loop

Every 50 ms the native player emits a `playbackStatusUpdate`. When A-B mode is active, `AudioEngine` checks if `currentTime >= pointB`. If so, it calls `seekTo(pointA)` and emits a `loopCompleted` event — which the timer's loop counter listens to.

### Timer

The `useTimerManager` hook handles two independent modes:
- **Countdown** — a `setInterval` counting down milliseconds. When it reaches zero, volume is faded to 0 over 3 seconds via the engine's `setVolume`.
- **Loop counter** — listens to the engine's `onLoopCompleted` event and increments a counter until the target is hit, then stops.

---

## App Info

| Field | Value |
|---|---|
| App Name | Still |
| Package ID | `com.still.player` |
| Version | 1.0.0 |
| Min SDK | Android 7.0 (API 24) |
| Target SDK | API 36 |
| Architectures | arm64-v8a |

---

## License

MIT © 2025 Allengl