import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const webStorage = {
  getItem: (key: string): Promise<string | null> => {
    try { return Promise.resolve(localStorage.getItem(key)); }
    catch { return Promise.resolve(null); }
  },
  setItem: (key: string, value: string): Promise<void> => {
    try { localStorage.setItem(key, value); }
    catch (e) { console.warn('localStorage setItem error:', e); }
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    try { localStorage.removeItem(key); }
    catch { /* ignore */ }
    return Promise.resolve();
  },
};

let nativeStorage: typeof webStorage | null = null;

if (!isWeb) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    nativeStorage = {
      getItem: (key: string) => AsyncStorage.getItem(key),
      setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
      removeItem: (key: string) => AsyncStorage.removeItem(key),
    };
  } catch {
    nativeStorage = webStorage;
  }
}

const storage = isWeb ? webStorage : (nativeStorage || webStorage);

export default storage;
