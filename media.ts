const PLACEHOLDER_POSTER =
  'https://via.placeholder.com/480x720/111111/FFFFFF?text=KING+IPTV';

const extractString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const proxyImageUrl = (url: string) =>
  `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;

export const getPosterUri = (...candidates: unknown[]) => {
  for (const candidate of candidates) {
    const raw = extractString(candidate);
    if (!raw) continue;

    if (raw.startsWith('//')) {
      return `https:${raw}`;
    }

    if (raw.startsWith('http://')) {
      return proxyImageUrl(raw);
    }

    return raw;
  }

  return PLACEHOLDER_POSTER;
};
