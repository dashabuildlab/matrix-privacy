import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAppStore } from '@/stores/useAppStore';

export default function Index() {
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    // Wait for Zustand persist to rehydrate from AsyncStorage before deciding route.
    // On Android Expo Go, the store may start with defaults until hydration completes.
    const unsub = useAppStore.persist.onFinishHydration(() => {
      decide();
    });

    // If already hydrated (web, fast storage), decide immediately
    if ((useAppStore.persist as any)?.hasHydrated?.()) {
      decide();
    }

    // Fallback timeout — if hydration takes too long, decide with current state
    const timeout = setTimeout(() => {
      if (!route) decide();
    }, 1500);

    function decide() {
      const state = useAppStore.getState();
      if (state.isAuthenticated) {
        // Logged in — go to main app
        setRoute('/(tabs)/matrix');
      } else if (state.onboardingCompleted) {
        // Completed onboarding but logged out — go to login
        setRoute('/auth/login');
      } else {
        // Fresh install — go to welcome/onboarding
        setRoute('/welcome');
      }
    }

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);

  if (!route) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <Redirect href={route as any} />;
}
