import AsyncStorage from '@react-native-async-storage/async-storage';

import { getIptvData } from '@/services/iptvApi';

import { getMediaCategory, type MediaBase } from './content';
import { STORAGE_KEYS } from './settings';

export type CatalogMode = 'live' | 'vod' | 'series';

export type LoginData = {
  url: string;
  username: string;
  password: string;
};

const modeAction: Record<CatalogMode, string> = {
  live: 'get_live_streams',
  vod: 'get_vod_streams',
  series: 'get_series',
};

const modeCache: Record<CatalogMode, string> = {
  live: STORAGE_KEYS.liveCache,
  vod: STORAGE_KEYS.vodCache,
  series: STORAGE_KEYS.seriesCache,
};

const asArray = (value: unknown): MediaBase[] =>
  Array.isArray(value) ? (value as MediaBase[]) : [];

export const loadCatalog = async (
  mode: CatalogMode,
  login: LoginData,
  useCache = true
) => {
  const cacheKey = modeCache[mode];

  if (useCache) {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      try {
        return asArray(JSON.parse(cached));
      } catch {
        // ignore cache parse errors and refetch
      }
    }
  }

  const data = await getIptvData(
    login.url,
    login.username,
    login.password,
    modeAction[mode]
  );

  const items = asArray(data);
  await AsyncStorage.setItem(cacheKey, JSON.stringify(items));

  return items;
};

export const loadShortEpg = async (
  login: LoginData,
  streamId: string | number,
  limit = 1
) => {
  const data = await getIptvData(
    login.url,
    login.username,
    login.password,
    'get_short_epg',
    {
      stream_id: streamId,
      limit,
    }
  );

  if (!data || typeof data !== 'object') return [];

  const listings = (data as { epg_listings?: unknown }).epg_listings;
  return Array.isArray(listings) ? listings : [];
};

export const groupCatalogByCategory = (items: MediaBase[]) => {
  const groups = new Map<string, MediaBase[]>();

  for (const item of items) {
    const key = getMediaCategory(item);
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }

  return Array.from(groups.entries()).map(([title, data]) => ({
    title,
    data,
  }));
};
