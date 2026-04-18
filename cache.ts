import AsyncStorage from '@react-native-async-storage/async-storage';

export const CACHE_KEYS = [
  '@iptv_history',
  '@iptv_cache_live_streams',
  '@iptv_cache_vod_streams',
  '@iptv_cache_series_streams',
  '@iptv_cache_live_categories',
  '@iptv_cache_vod_categories',
  '@iptv_cache_series_categories',
  '@iptv_cache_epg',
] as const;

export const clearCache = async () => {
  await AsyncStorage.multiRemove([...CACHE_KEYS]);
  return [...CACHE_KEYS];
};
