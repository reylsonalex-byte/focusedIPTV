import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { buildSeriesEpisodeUrl, buildVodUrl } from '@/src/lib/api';
import { getPosterUri } from '@/src/lib/media';
import { getIptvData } from '../services/iptvApi';

const cleanString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const displayValue = (value: unknown) => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

type VodMeta = {
  name?: string;
  plot?: string;
  year?: string | number;
  rating?: string | number;
  duration?: string | number;
  movie_image?: string;
  cover_big?: string;
  stream_icon?: string;
  container_extension?: string;
  direct_source?: string;
};

type VodDetails = {
  info?: VodMeta;
  movie_data?: VodMeta;
};

type SeriesEpisode = {
  id?: string | number;
  title?: string;
  episode_num?: string | number;
  container_extension?: string;
  direct_source?: string;
  info?: VodMeta;
  season?: number;
};

type SeriesDetails = {
  info?: VodMeta & {
    episodes?: Record<string, SeriesEpisode[]>;
  };
  episodes?: Record<string, SeriesEpisode[]>;
};

type DetailMode = 'vod' | 'series';

type LoginData = {
  url: string;
  username: string;
  password: string;
};

const parseMode = (value: unknown): DetailMode =>
  value === 'series' ? 'series' : 'vod';

export default function Detalhes() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<VodDetails | SeriesDetails | null>(null);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [vodStreamUrl, setVodStreamUrl] = useState('');

  const contentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const mode = parseMode(Array.isArray(params.kind) ? params.kind[0] : params.kind);
  const titleParam = Array.isArray(params.name) ? params.name[0] : params.name;
  const posterParam = Array.isArray(params.posterUri) ? params.posterUri[0] : params.posterUri;

  useEffect(() => {
    void carregarDetalhes();
  }, [contentId, mode]);

  const carregarDetalhes = async () => {
    try {
      setLoading(true);

      const loginRaw = await AsyncStorage.getItem('@iptv_login');
      if (!loginRaw) {
        router.replace('/');
        return;
      }

      if (!contentId) {
        throw new Error('Id invalido');
      }

      const { url, username, password } = JSON.parse(loginRaw);

      if (mode === 'series') {
        const data = await getIptvData(url, username, password, 'get_series_info', {
          series_id: contentId,
        });

        if (data && (data.info || data.episodes)) {
          const next = data as SeriesDetails;
          setInfo(next);

          const seasons = Object.keys(next.episodes || next.info?.episodes || {});
          setSelectedSeason(seasons[0] || '');
          return;
        }

        throw new Error('Dados invalidos');
      }

      const data = await getIptvData(url, username, password, 'get_vod_info', {
        vod_id: contentId,
      });

      if (data && (data.info || data.movie_data)) {
        const next = data as VodDetails;
        setInfo(next);

        const movie = next.movie_data ?? {};
        const infoData = next.info ?? {};
        const directSource =
          cleanString(movie.direct_source) || cleanString(infoData.direct_source);
        const containerExtension =
          cleanString(movie.container_extension) ||
          cleanString(infoData.container_extension) ||
          'mp4';

        setVodStreamUrl(
          directSource ||
            buildVodUrl(url, username, password, contentId, containerExtension)
        );
      } else {
        throw new Error('Dados invalidos');
      }
    } catch {
      Alert.alert(
        'Aviso',
        'Nao foi possivel carregar os detalhes deste conteudo.'
      );
      if (router.canGoBack()) router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  };

  const posterUri = getPosterUri(
    (info as VodDetails)?.movie_data?.movie_image,
    (info as VodDetails)?.info?.movie_image,
    (info as VodDetails)?.movie_data?.cover_big,
    (info as VodDetails)?.info?.cover_big,
    (info as VodDetails)?.movie_data?.stream_icon,
    (info as VodDetails)?.info?.stream_icon,
    posterParam
  );

  const title =
    cleanString((info as VodDetails)?.info?.name) ||
    cleanString((info as VodDetails)?.movie_data?.name) ||
    cleanString(titleParam) ||
    'Conteudo';

  const seriesEpisodes = useMemo(() => {
    if (mode !== 'series') return [];
    const series = info as SeriesDetails | null;
    const all = series?.episodes || series?.info?.episodes || {};
    const list = all[selectedSeason] || [];
    return Array.isArray(list) ? list : [];
  }, [info, mode, selectedSeason]);

  const seriesSeasons = useMemo(() => {
    if (mode !== 'series') return [];
    const series = info as SeriesDetails | null;
    const all = series?.episodes || series?.info?.episodes || {};
    return Object.keys(all);
  }, [info, mode]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const vodMeta = (info as VodDetails)?.movie_data ?? (info as VodDetails)?.info ?? {};
  const seriesMeta = (info as SeriesDetails)?.info ?? {};

  const playVod = () => {
    router.push({
      pathname: '/player',
      params: {
        id: contentId,
        kind: 'vod',
        title,
        posterUri,
        streamUrl: vodStreamUrl,
        plot: cleanString(vodMeta.plot),
        year: displayValue(vodMeta.year),
        rating: displayValue(vodMeta.rating),
        duration: displayValue(vodMeta.duration),
      },
    });
  };

  return (
    <LinearGradient colors={['#09090C', '#111117', '#09090C']} style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scroll} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={{ uri: posterUri }} style={styles.poster} />
          <LinearGradient
            colors={['rgba(8,8,12,0.12)', 'rgba(8,8,12,0.94)']}
            style={styles.heroShade}
          />

          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>

          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>
              {mode === 'series' ? 'Serie' : 'Detalhes'}
            </Text>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.metaText}>
              {displayValue(vodMeta.year || seriesMeta.year) || 'N/A'}
              {'  |  '}
              {displayValue(vodMeta.rating || seriesMeta.rating) || '0.0'}
              {'  |  '}
              {displayValue(vodMeta.duration || seriesMeta.duration) || ''}
            </Text>

            {mode === 'vod' ? (
              <Pressable style={styles.playBtn} onPress={playVod}>
                <Ionicons name="play" size={20} color="#0B0B0F" />
                <Text style={styles.playText}>ASSISTIR AGORA</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.content}>
          {mode === 'vod' ? (
            <>
              <Text style={styles.subtitle}>Sinopse</Text>
              <Text style={styles.plot}>
                {cleanString(vodMeta.plot) || 'Sem descricao disponivel.'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>Sinopse</Text>
              <Text style={styles.plot}>
                {cleanString(seriesMeta.plot) || 'Sem descricao disponivel.'}
              </Text>

              <View style={styles.seasonRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {seriesSeasons.map((season) => {
                    const active = season === selectedSeason;
                    return (
                      <Pressable
                        key={season}
                        style={[styles.seasonChip, active && styles.seasonChipActive]}
                        onPress={() => setSelectedSeason(season)}
                      >
                        <Text
                          style={[
                            styles.seasonChipText,
                            active && styles.seasonChipTextActive,
                          ]}
                        >
                          Temporada {season}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.episodeSection}>
                <View style={styles.episodeHeader}>
                  <Text style={styles.episodeTitle}>Episodios</Text>
                  <Text style={styles.episodeCount}>{seriesEpisodes.length} itens</Text>
                </View>

                {seriesEpisodes.length === 0 ? (
                  <Text style={styles.emptyEpisodes}>Nenhum episodio encontrado.</Text>
                ) : (
                  seriesEpisodes.map((episode) => {
                    const episodeTitle =
                      cleanString(episode.title) ||
                      `Episodio ${displayValue(episode.episode_num) || ''}`.trim();

                    return (
                      <Pressable
                        key={String(episode.id ?? episodeTitle)}
                        style={styles.episodeRow}
                        onPress={() => {
                          const loginPromise = AsyncStorage.getItem('@iptv_login').then((raw) => {
                            if (!raw) return null;

                            try {
                              return JSON.parse(raw) as LoginData;
                            } catch {
                              return null;
                            }
                          });

                          void (async () => {
                            const login = await loginPromise;
                            if (!login) return;

                            const episodeId = cleanString(episode.id);
                            if (!episodeId) return;

                            const streamUrl =
                              cleanString(episode.direct_source) ||
                              buildSeriesEpisodeUrl(
                                login.url,
                                login.username,
                                login.password,
                                episodeId,
                                episode.container_extension || 'mp4'
                              );

                            router.push({
                              pathname: '/player',
                              params: {
                                id: contentId,
                                kind: 'series',
                                seriesId: contentId,
                                episodeId,
                                streamUrl,
                                title: `${title} - ${episodeTitle}`,
                                posterUri,
                                plot: cleanString(episode.info?.plot) || cleanString(seriesMeta.plot),
                                year: displayValue(seriesMeta.year),
                                rating: displayValue(seriesMeta.rating),
                                duration: displayValue(seriesMeta.duration),
                              },
                            });
                          })();
                        }}
                      >
                        <View style={styles.episodeDot}>
                          <Ionicons name="play" size={16} color="#fff" />
                        </View>
                        <View style={styles.episodeCopy}>
                          <Text style={styles.episodeName} numberOfLines={1}>
                            {episodeTitle || 'Episodio'}
                          </Text>
                          <Text style={styles.episodeMeta} numberOfLines={1}>
                            {displayValue(episode.episode_num) || '0'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#666" />
                      </Pressable>
                    );
                  })
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  center: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    height: 520,
    width: '100%',
    justifyContent: 'flex-end',
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.42)',
    padding: 10,
    borderRadius: 12,
  },
  heroCopy: {
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  eyebrow: {
    color: '#C4B5FD',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 10,
  },
  metaText: {
    color: '#C7C7D1',
    fontSize: 13,
    fontWeight: '700',
  },
  playBtn: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 18,
    width: '100%',
  },
  playText: { color: '#0B0B0F', fontWeight: '900', fontSize: 15 },
  content: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 40,
    backgroundColor: '#0B0B0F',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
  },
  subtitle: {
    color: '#7C3AED',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  plot: { color: '#A0A0AB', fontSize: 15, lineHeight: 24 },
  seasonRow: {
    marginTop: 18,
    marginBottom: 8,
  },
  seasonChip: {
    marginRight: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: '#1C1C22',
  },
  seasonChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  seasonChipText: {
    color: '#A0A0AB',
    fontWeight: '800',
    fontSize: 12,
  },
  seasonChipTextActive: {
    color: '#fff',
  },
  episodeSection: {
    marginTop: 18,
  },
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  episodeCount: {
    color: '#666',
    fontSize: 12,
  },
  emptyEpisodes: {
    color: '#8A8A94',
    marginTop: 10,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141418',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1C1C22',
    marginBottom: 10,
    gap: 12,
  },
  episodeDot: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeCopy: {
    flex: 1,
  },
  episodeName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  episodeMeta: {
    color: '#8A8A94',
    marginTop: 4,
    fontSize: 12,
  },
});
