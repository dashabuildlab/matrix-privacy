/**
 * Zustand storage adapter.
 *
 * Native:  react-native-mmkv  — synchronous C++ storage, ~30× faster than AsyncStorage.
 *          Requires a dev-client or standalone build (not Expo Go).
 *          Install: npx expo install react-native-mmkv
 *
 * Web:     localStorage — synchronous, no extra dependency.
 *
 * To switch back to AsyncStorage during development (Expo Go), set
 * USE_ASYNC_STORAGE=true in .env or just swap the import below.
 */
import { Platform } from 'react-native';
import { StateStorage } from 'zustand/middleware';

// ─── Web storage ─────────────────────────────────────────────────────────────
const webStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
};

// ─── Native: MMKV ────────────────────────────────────────────────────────────
// Lazy-require so the module is only loaded on native (avoids web crash if
// react-native-mmkv is not available in the build).
function createMmkvStorage(): StateStorage {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MMKV } = require('react-native-mmkv');
    const mmkv = new MMKV({ id: 'matrix-of-soul-store' });
    return {
      getItem: (name) => mmkv.getString(name) ?? null,
      setItem: (name, value) => mmkv.set(name, value),
      removeItem: (name) => mmkv.delete(name),
    };
  } catch {
    // Fallback to AsyncStorage if MMKV is not available (Expo Go / bare without native build)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return {
      getItem: (name) => AsyncStorage.getItem(name),
      setItem: (name, value) => AsyncStorage.setItem(name, value),
      removeItem: (name) => AsyncStorage.removeItem(name),
    };
  }
}

export const fileStorage: StateStorage =
  Platform.OS === 'web' ? webStorage : createMmkvStorage();
