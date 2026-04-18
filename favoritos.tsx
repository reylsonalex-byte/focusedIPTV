import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ContentPoster } from '@/components/content-poster';
import { getPosterUri } from '@/src/lib/media';
import { getMediaPoster, isAdultContent, type MediaBase } from '@/src/lib/content';
import { pushProtectedRoute } from '@/src/lib/navigation';
import {
  getParentalLockEnabled,
  getUnlockedParentalSession,
} from '@/src/lib/settings';
import { getIptvData } from '../../services/iptvApi';

type VodItem = MediaBase & {
  stream_id: string | number;
  name: string;
};

export default function Favoritos() {
  const [loading, setLoading] = useState(true);
  const [favItems, setFavItems] = useState<VodItem[]>([]);
  const [parentalLock, setParentalLock] = useState(false);
  const [parentalUnlocked, setParentalUnlocked] = useState(false);
  const router = useRouter();

  const carregarFavoritos = async () => {
    try {
      setLoading(true);

      const loginRaw = await AsyncStorage.getItem('@iptv_login');
      const favsRaw = await AsyncStorage.getItem('@favoritos_ids');

      if (!loginRaw || !favsRaw) {
        setFavItems([]);
        return;
      }

      const { url, username, password } = JSON.parse(loginRaw);
      const favoritosIds = JSON.parse(favsRaw);
      const allVod = await getIptvData(url, username, password, 'get_vod_streams');

      if (allVod && Array.isArray(allVod)) {
        const filtrados = allVod.filter(
          (filme: VodItem) =>
            favoritosIds.includes(filme.stream_id.toString()) ||
            favoritosIds.includes(filme.stream_id)
        );
        setFavItems(filtrados);
      } else {
        setFavItems([]);
      }
    } catch (error) {
      console.error(error);
      setFavItems([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshPrefs = useCallback(async () => {
    const [lock, unlocked] = await Promise.all([
      getParentalLockEnabled(),
      getUnlockedParentalSession(),
    ]);

    setParentalLock(lock);
    setParentalUnlocked(unlocked);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregarFavoritos();
      void refreshPrefs();
    }, [refreshPrefs])
  );

  const openItem = (item: VodItem) => {
    const requiresPin = parentalLock && !parentalUnlocked && isAdultContent(item);

    pushProtectedRoute(
      '/detalhes',
      {
        id: item.stream_id,
        name: item.name,
        kind: 'vod',
        posterUri: getPosterUri(getMediaPoster(item)),
      },
      requiresPin
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meus Favoritos</Text>
      </View>

      {favItems.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-dislike-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>Sua lista esta vazia.</Text>
          <Pressable
            style={styles.btnExplorar}
            onPress={() => router.push('/(tabs)/dashboard')}
          >
            <Text style={styles.btnText}>Explorar Filmes</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={favItems}
          numColumns={2}
          keyExtractor={(item) => item.stream_id.toString()}
          renderItem={({ item }) => (
            <ContentPoster
              title={item.name}
              posterUri={getPosterUri(getMediaPoster(item))}
              onPress={() => openItem(item)}
              style={styles.card}
              titleLines={1}
              badgeLabel={isAdultContent(item) ? '18+' : 'FILME'}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 100 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  center: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyText: { color: '#666', marginTop: 15, fontSize: 16 },
  btnExplorar: {
    marginTop: 20,
    backgroundColor: '#1C1C22',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  btnText: { color: '#7C3AED', fontWeight: 'bold' },
  card: {
    margin: 6,
  },
});
