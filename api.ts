const ensureProtocol = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `http://${url}`;

const stripPlayerApi = (url: string) =>
  url.replace(/\/?player_api\.php(?:[?#].*)?$/i, '');

const normalizeBaseUrl = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return '';

  const withProtocol = ensureProtocol(trimmed).replace(/\/+$/, '');

  try {
    const parsed = new URL(withProtocol);
    parsed.hash = '';
    parsed.search = '';
    parsed.pathname = stripPlayerApi(parsed.pathname).replace(/\/+$/, '');

    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return stripPlayerApi(withProtocol).replace(/\/+$/, '');
  }
};

const normalizeExtension = (extension?: string | null) => {
  const value = typeof extension === 'string' ? extension.trim() : '';
  if (!value) return 'mp4';
  return value.startsWith('.') ? value.slice(1) : value;
};

const normalizeLiveExtension = (extension?: string | null) => {
  const value = typeof extension === 'string' ? extension.trim() : '';
  if (!value) return 'm3u8';
  return value.startsWith('.') ? value.slice(1) : value;
};

const encode = (value: string | number) => encodeURIComponent(String(value));

export const buildPlayerApiUrl = (baseUrl: string) =>
  `${normalizeBaseUrl(baseUrl)}/player_api.php`;

export const buildVodListUrl = (
  baseUrl: string,
  username: string,
  password: string
) =>
  `${buildPlayerApiUrl(baseUrl)}?username=${encode(username.trim())}&password=${encode(
    password.trim()
  )}&action=get_vod_streams`;

export const buildLiveListUrl = (
  baseUrl: string,
  username: string,
  password: string
) =>
  `${buildPlayerApiUrl(baseUrl)}?username=${encode(username.trim())}&password=${encode(
    password.trim()
  )}&action=get_live_streams`;

export const buildSeriesListUrl = (
  baseUrl: string,
  username: string,
  password: string
) =>
  `${buildPlayerApiUrl(baseUrl)}?username=${encode(username.trim())}&password=${encode(
    password.trim()
  )}&action=get_series`;

export const buildVodUrl = (
  baseUrl: string,
  username: string,
  password: string,
  streamId: string | number,
  extension?: string | null
) =>
  `${normalizeBaseUrl(baseUrl)}/movie/${encode(username.trim())}/${encode(
    password.trim()
  )}/${encode(streamId)}.${encode(normalizeExtension(extension))}`;

export const buildLiveUrl = (
  baseUrl: string,
  username: string,
  password: string,
  streamId: string | number,
  extension?: string | null
) =>
  `${normalizeBaseUrl(baseUrl)}/live/${encode(username.trim())}/${encode(
    password.trim()
  )}/${encode(streamId)}.${encode(normalizeLiveExtension(extension))}`;

export const buildSeriesEpisodeUrl = (
  baseUrl: string,
  username: string,
  password: string,
  episodeId: string | number,
  extension?: string | null
) =>
  `${normalizeBaseUrl(baseUrl)}/series/${encode(username.trim())}/${encode(
    password.trim()
  )}/${encode(episodeId)}.${encode(normalizeExtension(extension))}`;

export const buildShortEpgUrl = (
  baseUrl: string,
  username: string,
  password: string,
  streamId: string | number,
  limit = 5
) =>
  `${buildPlayerApiUrl(baseUrl)}?username=${encode(username.trim())}&password=${encode(
    password.trim()
  )}&action=get_short_epg&stream_id=${encode(streamId)}&limit=${encode(limit)}`;

export const fetchSafe = async (url: string, timeout = 10000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP ERROR: ${res.status}`);
    }

    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch {
      console.log('Resposta nao e JSON valido');
      return null;
    }
  } catch (err: any) {
    clearTimeout(timer);

    if (err?.name === 'AbortError') {
      console.log('Timeout da API atingido');
    } else {
      console.log('Erro fetch:', err?.message || err);
    }

    return null;
  }
};
