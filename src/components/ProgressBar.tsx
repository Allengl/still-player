import React from "react";
import { View, Text, StyleSheet, PanResponder, Platform } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { theme } from "../constants/theme";
import { formatTime } from "../utils/formatTime";
import type { ABMarkers } from "../types/audio";

interface Props {
    currentTime: number;
    duration: number;
    abMarkers: ABMarkers;
    onSeek: (seconds: number) => void;
}

export function ProgressBar({
    currentTime,
    duration,
    abMarkers,
    onSeek,
}: Props) {
    const [barWidth, setBarWidth] = React.useState(0);
    const containerRef = React.useRef<View>(null);
    const barPageXRef = React.useRef(0);

    const progress = duration > 0 ? currentTime / duration : 0;

    const markerAPos =
        abMarkers.pointA !== null && duration > 0 && barWidth > 0
            ? (abMarkers.pointA / duration) * barWidth
            : null;
    const markerBPos =
        abMarkers.pointB !== null && duration > 0 && barWidth > 0
            ? (abMarkers.pointB / duration) * barWidth
            : null;

    // Compute the bar's absolute left edge.
    // On web we use getBoundingClientRect (synchronous, always current).
    // On native we cache the value via measure() called from onLayout.
    const refreshBarPageX = React.useCallback(() => {
        if (!containerRef.current) return;
        if (Platform.OS === "web") {
            const el = containerRef.current as unknown as Element;
            const rect = el.getBoundingClientRect?.();
            if (rect) barPageXRef.current = rect.left;
        } else {
            containerRef.current.measure((_x, _y, _w, _h, pageX) => {
                barPageXRef.current = pageX;
            });
        }
    }, []);

    const handleLayout = (e: LayoutChangeEvent) => {
        setBarWidth(e.nativeEvent.layout.width);
        // Small defer so the layout is committed before we measure absolute pos
        setTimeout(refreshBarPageX, 0);
    };

    // Convert a raw page-X coordinate to a seek position in seconds.
    const seekFromPageX = React.useCallback(
        (pageX: number) => {
            if (barWidth <= 0 || duration <= 0) return;

            // On web, always re-read the rect so scroll / resize are handled.
            if (Platform.OS === "web" && containerRef.current) {
                const el = containerRef.current as unknown as Element;
                const rect = el.getBoundingClientRect?.();
                if (rect) barPageXRef.current = rect.left;
            }

            const relX = pageX - barPageXRef.current;
            const fraction = Math.max(0, Math.min(1, relX / barWidth));
            if (!Number.isFinite(fraction)) return;
            onSeek(fraction * duration);
        },
        [barWidth, duration, onSeek],
    );

    const panResponder = React.useMemo(
        () =>
            PanResponder.create({
                // Claim the responder on both tap and move so drag-seek works.
                onStartShouldSetPanResponder: () =>
                    duration > 0 && barWidth > 0,
                onMoveShouldSetPanResponder: () => duration > 0 && barWidth > 0,
                // Prevent parent scroll-views from stealing the gesture mid-drag.
                onPanResponderTerminationRequest: () => false,

                onPanResponderGrant: (e) => {
                    seekFromPageX(e.nativeEvent.pageX);
                },
                onPanResponderMove: (e) => {
                    seekFromPageX(e.nativeEvent.pageX);
                },
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [seekFromPageX, duration, barWidth],
    );

    return (
        <View style={styles.container}>
            <View
                ref={containerRef}
                style={styles.barContainer}
                onLayout={handleLayout}
                {...panResponder.panHandlers}
            >
                {/* Track background */}
                <View style={styles.track} />

                {/* A-B region highlight */}
                {markerAPos !== null && markerBPos !== null && (
                    <View
                        style={[
                            styles.abRegion,
                            {
                                left: markerAPos,
                                width: markerBPos - markerAPos,
                            },
                        ]}
                    />
                )}

                {/* Filled progress */}
                <View style={[styles.fill, { width: `${progress * 100}%` }]} />

                {/* A marker */}
                {markerAPos !== null && (
                    <View
                        style={[
                            styles.marker,
                            styles.markerA,
                            { left: markerAPos - 1 },
                        ]}
                    />
                )}

                {/* B marker */}
                {markerBPos !== null && (
                    <View
                        style={[
                            styles.marker,
                            styles.markerB,
                            { left: markerBPos - 1 },
                        ]}
                    />
                )}
            </View>

            {/* Time labels */}
            <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingHorizontal: theme.spacing.md,
    },
    barContainer: {
        height: 32,
        justifyContent: "center",
        // Make the hit area obvious on web (grabbing cursor while hovering)
        ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : {}),
    },
    track: {
        position: "absolute",
        left: 0,
        right: 0,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.progressTrack,
    },
    fill: {
        position: "absolute",
        left: 0,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.progressFill,
    },
    abRegion: {
        position: "absolute",
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.abRegion,
    },
    marker: {
        position: "absolute",
        width: 2,
        height: 16,
        top: 8,
        borderRadius: 1,
    },
    markerA: {
        backgroundColor: theme.colors.markerA,
    },
    markerB: {
        backgroundColor: theme.colors.markerB,
    },
    timeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: theme.spacing.xs,
    },
    timeText: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.sm,
        fontVariant: ["tabular-nums"],
    },
});
