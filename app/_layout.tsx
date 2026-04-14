import React from 'react';
import { Tabs } from 'expo-router';
import { Play, FolderOpen } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { AudioEngineProvider } from '../src/engine/AudioEngineContext';
import { theme } from '../src/constants/theme';

export default function RootLayout() {
  return (
    <AudioEngineProvider>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.surfaceLight,
            borderTopWidth: 0.5,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textMuted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Player',
            tabBarIcon: ({ color, size }) => <Play size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarIcon: ({ color, size }) => (
              <FolderOpen size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </AudioEngineProvider>
  );
}
