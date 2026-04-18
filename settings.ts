import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  login: '@iptv_login',
  history: '@iptv_history',
  externalPlayer: '@pref_external_player',
  parentalLock: '@pref_parental',
  parentalPin: '@pref_parental_pin',
  unlockedSession: '@pref_parental_unlocked',
  liveCache: '@iptv_cache_live_streams',
  vodCache: '@iptv_cache_vod_streams',
  seriesCache: '@iptv_cache_series_streams',
  liveCategoriesCache: '@iptv_cache_live_categories',
  vodCategoriesCache: '@iptv_cache_vod_categories',
  seriesCategoriesCache: '@iptv_cache_series_categories',
  epgCache: '@iptv_cache_epg',
} as const;

const asBoolean = (value: unknown) => value === true || value === 'true';

const readBoolean = async (key: string, fallback = false) => {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return fallback;

  try {
    return asBoolean(JSON.parse(raw));
  } catch {
    return asBoolean(raw);
  }
};

export const getExternalPlayerEnabled = () =>
  readBoolean(STORAGE_KEYS.externalPlayer, false);

export const setExternalPlayerEnabled = async (enabled: boolean) => {
  await AsyncStorage.setItem(STORAGE_KEYS.externalPlayer, JSON.stringify(enabled));
};

export const getParentalLockEnabled = () =>
  readBoolean(STORAGE_KEYS.parentalLock, false);

export const setParentalLockEnabled = async (enabled: boolean) => {
  await AsyncStorage.setItem(STORAGE_KEYS.parentalLock, JSON.stringify(enabled));
};

export const getParentalPin = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.parentalPin);
  return typeof raw === 'string' ? raw.trim() : '';
};

export const setParentalPin = async (pin: string) => {
  await AsyncStorage.setItem(STORAGE_KEYS.parentalPin, pin.trim());
};

export const clearContentCache = async () => {
  const keys = [
    STORAGE_KEYS.history,
    STORAGE_KEYS.liveCache,
    STORAGE_KEYS.vodCache,
    STORAGE_KEYS.seriesCache,
    STORAGE_KEYS.liveCategoriesCache,
    STORAGE_KEYS.vodCategoriesCache,
    STORAGE_KEYS.seriesCategoriesCache,
    STORAGE_KEYS.epgCache,
  ];

  await AsyncStorage.multiRemove(keys);

  return keys;
};

export const setUnlockedParentalSession = async (value: boolean) => {
  await AsyncStorage.setItem(
    STORAGE_KEYS.unlockedSession,
    JSON.stringify(value)
  );
};

export const getUnlockedParentalSession = () =>
  readBoolean(STORAGE_KEYS.unlockedSession, false);
