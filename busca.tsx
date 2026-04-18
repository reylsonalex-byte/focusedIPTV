import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
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

export default function Busca() {
  const [busca, setBusca] = useState('');
  const [lista, setLista] = useState<VodItem[]>([]);
  const [filtrados, setFiltrados] = useState<VodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentalLock, setParentalLock] = useState(false);
  const [parentalUnlocked, setParentalUnlocked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@iptv_login');
        if (!raw) return;

        const { url, username, password } = JSON.parse(raw);
        const data = await getIptvData(url, username, password, 'get_vod_streams');

        const items = Array.isArray(data) ? (data as VodItem[]) : [];
        setLista(items);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      void refreshPrefs();
    }, [refreshPrefs])
  );

  const handleBusca = (text: string) => {
    setBusca(text);

    if (text.trim().length > 2) {
      const query = text.toLowerCase();
      const res = lista.filter((item) => item.name.toLowerCase().includes(query));
      setFiltrados(res.slice(0, 30));
      return;
    }

    setFiltrados([]);
  };

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

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Busca</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#8A8A94" />
        <TextInput
          placeholder="O que vamos assistir?"
          placeholderTextColor="#8A8A94"
          style={styles.input}
          value={busca}
          onChangeText={handleBusca}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : (
        <FlatList
          data={filtrados}
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
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {busca.trim().length > 2 ? 'Nenhum resultado' : 'Digite pelo menos 3 letras'}
              </Text>
              <Text style={styles.emptyText}>
                {busca.trim().length > 2
                  ? 'Nao encontramos titulos com esse nome.'
                  : 'Use a busca para filtrar o catalogo carregado.'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 54,
    marginBottom: 14,
  },
  searchBox: {
    backgroundColor: '#1C1C22',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    color: '#fff',
    marginLeft: 10,
    fontSize: 15,
  },
  list: {
    paddingBottom: 100,
  },
  card: {
    margin: 6,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    paddingTop: 80,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    color: '#8A8A94',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
