import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { buildVodListUrl, fetchSafe } from '@/src/lib/api';
import { getHistory } from '@/src/lib/history';

type LoginData = {
  url: string;
  username: string;
  password: string;
};

type VodItem = {
  stream_id: number | string;
  name: string;
  stream_icon?: string;
  container_extension?: string;
  direct_source?: string;
};

export default function Dashboard() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [login, setLogin] = useState<LoginData | null>(null);
  const [items, setItems] = useState<VodItem[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const raw = await AsyncStorage.getItem('@iptv_login');

        if (!raw) {
          router.replace('/');
          return;
        }

        setLogin(JSON.parse(raw));
      } catch (e) {
        console.log('Erro ao iniciar dashboard:', e);
        router.replace('/');
      } finally {
        setReady(true);
      }
    };

    void init();
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadHistory = async () => {
        const data = await getHistory();
        if (active) setHistory(data);
      };

      void loadHistory();

      return () => {
        active = false;
      };
    }, [])
  );

  useEffect(() => {
    if (!login) return;

    let active = true;

    const loadVod = async () => {
      try {
        setLoading(true);

        const url = buildVodListUrl(
          login.url,
          login.username,
          login.password
        );

        const data = await fetchSafe(url, {}, 12000);

        if (!active) return;

        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!active) return;
        console.log('Erro ao carregar VOD:', e);
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadVod();

    return () => {
      active = false;
    };
  }, [login]);

  const continueWatching = useMemo(() => history.slice(0, 10), [history]);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Focused IPTV</Text>
        <Text style={styles.subtitle}>Sua central premium de conteúdo</Text>
      </View>

      {continueWatching.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continuar assistindo</Text>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={continueWatching}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item }) => (
              <Pressable
                style={styles.historyCard}
                onPress={() =>
                  router.push({
                    pathname: '/player',
                    params: {
                      id: item.id,
                      title: item.name,
                      streamUrl: item.streamUrl,
                    },
                  })
                }
              >
                <Text style={styles.historyTitle} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.historyMeta}>
                  Retomar em {Math.floor(item.progress || 0)}s
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Filmes</Text>

        {loading ? (
          <View style={styles.centerSmall}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : (
          <FlatList
            data={items}
            numColumns={3}
            keyExtractor={(item, index) =>
              String(item.stream_id ?? index)
            }
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/player',
                    params: {
                      id: String(item.stream_id),
                      title: item.name,
                      kind: 'vod',
                    },
                  })
                }
              >
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.name}
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090C',
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: '#A1A1AA',
    marginTop: 6,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  horizontalList: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  historyCard: {
    width: 180,
    backgroundColor: '#15151C',
    borderRadius: 18,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#222230',
  },
  historyTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  historyMeta: {
    color: '#A1A1AA',
    marginTop: 8,
    fontSize: 12,
  },
  grid: {
    paddingHorizontal: 10,
    paddingBottom: 40,
  },
  card: {
    flex: 1,
    minHeight: 94,
    margin: 6,
    backgroundColor: '#16161E',
    borderRadius: 18,
    padding: 12,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: '#20202A',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090C',
  },
  centerSmall: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
