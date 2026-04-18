import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ContentPoster } from '@/components/content-poster';
import { getPosterUri } from '@/src/lib/media';
import { getIptvData } from '../services/iptvApi';

type VodItem = {
  stream_id: string | number;
  name: string;
  stream_icon?: string;
  movie_image?: string;
  cover_big?: string;
};

export default function ListaConteudo() {
  const [loading, setLoading] = useState(true);
  const [listaCompleta, setListaCompleta] = useState<VodItem[]>([]);
  const [filtrados, setFiltrados] = useState<VodItem[]>([]);
  const [busca, setBusca] = useState('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const loginRaw = await AsyncStorage.getItem('@iptv_login');
        if (!loginRaw) return;

        const { url, username, password } = JSON.parse(loginRaw);
        const data = await getIptvData(url, username, password, 'get_vod_streams');

        const items = Array.isArray(data) ? (data as VodItem[]) : [];
        setListaCompleta(items);
        setFiltrados(items.slice(0, 50));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleBusca = (texto: string) => {
    setBusca(texto);

    if (texto.trim().length > 2) {
      const query = texto.toLowerCase();
      const resultado = listaCompleta.filter((item) =>
        item.name.toLowerCase().includes(query)
      );
      setFiltrados(resultado.slice(0, 50));
      return;
    }

    setFiltrados(listaCompleta.slice(0, 50));
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
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            placeholder="Buscar filmes..."
            placeholderTextColor="#666"
            style={styles.input}
            value={busca}
            onChangeText={handleBusca}
          />
        </View>
      </View>

      <FlatList
        data={filtrados}
        numColumns={2}
        keyExtractor={(item) => item.stream_id.toString()}
        renderItem={({ item }) => (
          <ContentPoster
            title={item.name}
            posterUri={getPosterUri(
              item.stream_icon,
              item.movie_image,
              item.cover_big
            )}
            onPress={() =>
              router.push({
                pathname: '/detalhes',
                params: { id: item.stream_id, name: item.name },
              })
            }
            style={styles.card}
            titleLines={1}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
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
  header: {
    marginTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  backBtn: { marginRight: 15 },
  searchBar: {
    flex: 1,
    backgroundColor: '#1C1C22',
    height: 45,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  input: { flex: 1, color: '#fff', marginLeft: 10, fontSize: 14 },
  card: { margin: 6 },
  list: { paddingHorizontal: 10, paddingBottom: 100 },
});
