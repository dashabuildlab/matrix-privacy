/**
 * Native storage: expo-secure-store with AsyncStorage fallback.
 * expo-secure-store v15 (SDK 54) uses JSI — can throw if the native
 * binding isn't registered (Expo Go version mismatch, or first cold start).
 * Falls back to AsyncStorage transparently.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

let _store: any = null;
let _storeChecked = false;

function getStore() {
  if (!_storeChecked) {
    _storeChecked = true;
    try {
      _store = require('expo-secure-store');
    } catch {
      _store = null;
    }
  }
  return _store;
}

export async function getItemAsync(key: string): Promise<string | null> {
  const store = getStore();
  if (store) {
    try {
      return await store.getItemAsync(key);
    } catch {}
  }
  return AsyncStorage.getItem(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  const store = getStore();
  if (store) {
    try {
      await store.setItemAsync(key, value);
      return;
    } catch {}
  }
  await AsyncStorage.setItem(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  const store = getStore();
  if (store) {
    try {
      await store.deleteItemAsync(key);
      return;
    } catch {}
  }
  await AsyncStorage.removeItem(key);
}
