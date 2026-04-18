import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@iptv_history';

export type HistoryItem = {
  id: string;
  name: string;
  streamUrl: string;
  posterUri?: string;
  progress: number;
  duration: number;
  updatedAt: number;
};

type HistoryInput = Partial<HistoryItem> & {
  id: string;
};

const asTrimmedString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const asFiniteNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeItem = (
  item: HistoryInput,
  existing?: HistoryItem
): HistoryItem => {
  const name = asTrimmedString(item.name) || existing?.name || 'Conteudo';
  const streamUrl =
    asTrimmedString(item.streamUrl) || existing?.streamUrl || '';
  const posterUri =
    asTrimmedString(item.posterUri) || existing?.posterUri || '';

  const existingProgress = existing?.progress ?? 0;
  const existingDuration = existing?.duration ?? 0;
  const incomingProgress = asFiniteNumber(item.progress);
  const incomingDuration = asFiniteNumber(item.duration);

  const progress =
    incomingProgress > 0 || existingProgress === 0
      ? incomingProgress
      : existingProgress;

  const duration =
    incomingDuration > 0 || existingDuration === 0
      ? incomingDuration
      : existingDuration;

  const safeDuration = Math.max(0, duration);
  const safeProgress =
    safeDuration > 0
      ? Math.min(Math.max(0, progress), safeDuration)
      : Math.max(0, progress);

  return {
    id: String(item.id),
    name,
    streamUrl,
    posterUri,
    progress: safeProgress,
    duration: safeDuration,
    updatedAt: asFiniteNumber(item.updatedAt) || Date.now(),
  };
};

const readHistory = async (): Promise<HistoryItem[]> => {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;

        const id = asTrimmedString((entry as HistoryInput).id);
        if (!id) return null;

        return normalizeItem(entry as HistoryInput);
      })
      .filter((entry): entry is HistoryItem => Boolean(entry))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
};

const writeHistory = async (items: HistoryItem[]) => {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
};

const upsertHistory = async (input: HistoryInput) => {
  const history = await readHistory();
  const index = history.findIndex((item) => item.id === String(input.id));
  const existing = index >= 0 ? history[index] : undefined;
  const nextItem = normalizeItem(input, existing);

  if (index >= 0) {
    history[index] = nextItem;
  } else {
    history.unshift(nextItem);
  }

  history.sort((a, b) => b.updatedAt - a.updatedAt);
  await writeHistory(history);

  return nextItem;
};

export const getHistory = async (): Promise<HistoryItem[]> => readHistory();

export const saveHistory = async (item: HistoryInput): Promise<void> => {
  await upsertHistory({
    ...item,
    updatedAt: item.updatedAt ?? Date.now(),
  });
};

export const updateProgress = async (
  id: string,
  progress: number,
  duration?: number
): Promise<void> => {
  const history = await readHistory();
  const index = history.findIndex((item) => item.id === id);
  const existing = index >= 0 ? history[index] : undefined;

  const nextItem = normalizeItem(
    {
      id,
      name: existing?.name,
      streamUrl: existing?.streamUrl,
      posterUri: existing?.posterUri,
      progress,
      duration:
        typeof duration === 'number' && Number.isFinite(duration) && duration > 0
          ? duration
          : existing?.duration,
      updatedAt: Date.now(),
    },
    existing
  );

  if (index >= 0) {
    history[index] = nextItem;
  } else {
    history.unshift(nextItem);
  }

  history.sort((a, b) => b.updatedAt - a.updatedAt);
  await writeHistory(history);
};
