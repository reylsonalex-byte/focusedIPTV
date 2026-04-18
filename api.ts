const DEFAULT_TIMEOUT = 12000;

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '');

export const buildPlayerApiUrl = (baseUrl: string) => {
  return `${normalizeBaseUrl(baseUrl)}/player_api.php`;
};

export const buildVodListUrl = (
  baseUrl: string,
  username: string,
  password: string
) => {
  return `${buildPlayerApiUrl(baseUrl)}?username=${encodeURIComponent(
    username
  )}&password=${encodeURIComponent(password)}&action=get_vod_streams`;
};

export const buildLiveListUrl = (
  baseUrl: string,
  username: string,
  password: string
) => {
  return `${buildPlayerApiUrl(baseUrl)}?username=${encodeURIComponent(
    username
  )}&password=${encodeURIComponent(password)}&action=get_live_streams`;
};

export const buildVodInfoUrl = (
  baseUrl: string,
  username: string,
  password: string,
  vodId: string | number
) => {
  return `${buildPlayerApiUrl(baseUrl)}?username=${encodeURIComponent(
    username
  )}&password=${encodeURIComponent(password)}&action=get_vod_info&vod_id=${vodId}`;
};

export const buildVodUrl = (
  baseUrl: string,
  username: string,
  password: string,
  id: string | number,
  extension = 'mp4'
) => {
  return `${normalizeBaseUrl(baseUrl)}/movie/${encodeURIComponent(
    username
  )}/${encodeURIComponent(password)}/${id}.${extension}`;
};

export const buildLiveUrl = (
  baseUrl: string,
  username: string,
  password: string,
  id: string | number,
  extension = 'm3u8'
) => {
  return `${normalizeBaseUrl(baseUrl)}/live/${encodeURIComponent(
    username
  )}/${encodeURIComponent(password)}/${id}.${extension}`;
};

export const buildSeriesEpisodeUrl = (
  baseUrl: string,
  username: string,
  password: string,
  episodeId: string | number,
  extension = 'mp4'
) => {
  return `${normalizeBaseUrl(baseUrl)}/series/${encodeURIComponent(
    username
  )}/${encodeURIComponent(password)}/${episodeId}.${extension}`;
};

export const fetchSafe = async (
  url: string,
  options: RequestInit = {},
  timeout = DEFAULT_TIMEOUT
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error) {
    console.log('fetchSafe error:', error);
    return null;
  } finally {
    clearTimeout(timer);
  }
};
