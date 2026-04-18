type MediaValue = string | number | boolean | null | undefined;

export type MediaBase = {
  stream_id?: string | number;
  series_id?: string | number;
  id?: string | number;
  name?: string;
  title?: string;
  category_id?: string | number;
  category_name?: string;
  genre?: string;
  plot?: string;
  description?: string;
  rating?: MediaValue;
  is_adult?: MediaValue;
  adult?: MediaValue;
  stream_icon?: string;
  movie_image?: string;
  cover_big?: string;
};

const adultPatterns = [
  /(^|\b)18\+(\b|$)/i,
  /\badult(?![a-z])/i,
  /\badulto\b/i,
  /\bxxx\b/i,
  /\bporn/i,
  /\bsexy\b/i,
  /\bhot\b/i,
];

const asBoolean = (value: MediaValue) =>
  value === true ||
  value === 1 ||
  value === '1' ||
  value === 'true' ||
  value === 'yes';

const asNumber = (value: MediaValue) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizedText = (value: MediaValue) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export const getMediaTitle = (item: MediaBase) =>
  item.name?.trim() ||
  item.title?.trim() ||
  `Conteudo ${getMediaId(item) || ''}`.trim() ||
  'Conteudo';

export const getMediaId = (item: MediaBase) =>
  String(item.stream_id ?? item.series_id ?? item.id ?? '').trim();

export const getMediaPoster = (item: MediaBase) =>
  item.stream_icon || item.movie_image || item.cover_big || '';

export const getMediaCategory = (item: MediaBase) =>
  item.category_name?.trim() ||
  item.genre?.trim() ||
  String(item.category_id ?? '').trim() ||
  'Geral';

export const isAdultContent = (item: MediaBase) => {
  if (asBoolean(item.is_adult) || asBoolean(item.adult)) {
    return true;
  }

  const rating = asNumber(item.rating);
  if (rating !== null && rating >= 18) {
    return true;
  }

  const haystack = [
    item.name,
    item.title,
    item.category_name,
    item.genre,
    item.plot,
    item.description,
  ]
    .map(normalizedText)
    .filter(Boolean)
    .join(' ');

  return adultPatterns.some((pattern) => pattern.test(haystack));
};
