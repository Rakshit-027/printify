import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/services/authContext';
import AppTabs from '@/components/app-tabs';
import LoginScreen from '@/components/LoginScreen';
import { Palette } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const PrintifyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Palette.paper,
    card: Palette.surface,
    text: Palette.ink.DEFAULT,
    border: Palette.hairline,
    primary: Palette.saffron.DEFAULT,
  },
};

function RootContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Palette.paper }}>
        <ActivityIndicator size="large" color={Palette.saffron.DEFAULT} />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <AppTabs />;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider value={PrintifyTheme}>
          <StatusBar style="dark" />
          <RootContent />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
