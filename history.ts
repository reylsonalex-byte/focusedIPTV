import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@iptv_history';

export type HistoryItem = {
  id: string;
  name: string;
  streamUrl: string;
  posterUri?: string;
  progress: number;
  duration?: number;
  updatedAt: number;
};

export const getHistory = async (): Promise<HistoryItem[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.log('Erro ao carregar histórico:', e);
    return [];
  }
};

export const saveHistory = async (item: HistoryItem) => {
  try {
    const current = await getHistory();
    const filtered = current.filter((entry) => entry.id !== item.id);
    const updated = [{ ...item, updatedAt: Date.now() }, ...filtered].slice(
      0,
      50
    );

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.log('Erro ao salvar histórico:', e);
  }
};

export const updateProgress = async (
  id: string,
  progress: number,
  duration?: number
) => {
  try {
    const current = await getHistory();
    const updated = current.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            progress,
            duration: duration ?? entry.duration,
            updatedAt: Date.now(),
          }
        : entry
    );

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.log('Erro ao atualizar progresso:', e);
  }
};
