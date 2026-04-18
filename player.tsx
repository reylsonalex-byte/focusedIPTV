import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEvent } from 'expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';

import { buildVodInfoUrl, buildVodUrl, fetchSafe } from '@/src/lib/api';
import { getHistory, saveHistory, updateProgress } from '@/src/lib/history';

type LoginData = {
  url: string;
  username: string;
  password: string;
};

type VodInfoResponse = {
  info?: {
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
  movie_data?: {
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
};

const cleanString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const displayValue = (value: unknown) => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const formatClock = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }

  return `${minutes}:${String(rest).padStart(2, '0')}`;
};

export default function Player() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const contentId = typeof params.id === 'string' ? params.id : '';
  const initialTitle = typeof params.title === 'string' ? params.title : '';
  const directStreamUrl =
    typeof params.streamUrl === 'string' ? params.streamUrl : '';

  const historyKey = contentId || directStreamUrl || 'playback';

  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(!directStreamUrl);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialTitle || 'Conteúdo');
  const [posterUri, setPosterUri] = useState('');
  const [plot, setPlot] = useState('Sem sinopse disponível.');
  const [meta, setMeta] = useState({
    year: '',
    rating: '',
    duration: '',
  });
  const [resumeSeconds, setResumeSeconds] = useState(0);

  const resumeTimeRef = useRef(0);

  const player = useVideoPlayer(null, (p) => {
    p.timeUpdateEventInterval = 5;
    p.staysActiveInBackground = false;
  });

  const playerStatus = useEvent(player, 'statusChange', {
    status: player.status,
  });

  const playbackTime = useEvent(player, 'timeUpdate', {
    currentTime: 0,
    bufferedPosition: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
  });

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);

        const stored = await AsyncStorage.getItem('@iptv_login');
        if (!stored) {
          router.replace('/');
          return;
        }

        const login = JSON.parse(stored) as LoginData;

        const history = await getHistory();
        const historyItem = history.find(
          (item) => item.id === historyKey || item.id === contentId
        );

        resumeTimeRef.current = historyItem?.progress ?? 0;
        setResumeSeconds(historyItem?.progress ?? 0);

        let nextTitle = initialTitle || historyItem?.name || 'Conteúdo';
        let nextPoster = historyItem?.posterUri || '';
        let nextPlot = 'Sem sinopse disponível.';
        let nextMeta = { year: '', rating: '', duration: '' };
        let nextStream = directStreamUrl;

        if (!nextStream) {
          if (!contentId) {
            throw new Error('Id inválido');
          }

          const infoUrl = buildVodInfoUrl(
            login.url,
            login.username,
            login.password,
            contentId
          );

          const response = (await fetchSafe(infoUrl, {}, 15000)) as VodInfoResponse | null;
          const movie = response?.movie_data ?? {};
          const info = response?.info ?? {};

          const directSource =
            cleanString(movie.direct_source) ||
            cleanString(info.direct_source);

          const containerExtension =
            cleanString(movie.container_extension) ||
            cleanString(info.container_extension) ||
            'mp4';

          nextTitle =
            initialTitle ||
            cleanString(movie.name) ||
            cleanString(info.name) ||
            nextTitle;

          nextPoster =
            cleanString(movie.movie_image) ||
            cleanString(info.movie_image) ||
            cleanString(movie.cover_big) ||
            cleanString(info.cover_big) ||
            cleanString(movie.stream_icon) ||
            cleanString(info.stream_icon) ||
            nextPoster;

          nextPlot =
            cleanString(movie.plot) ||
            cleanString(info.plot) ||
            nextPlot;

          nextMeta = {
            year: displayValue(movie.year) || displayValue(info.year),
            rating: displayValue(movie.rating) || displayValue(info.rating),
            duration: displayValue(movie.duration) || displayValue(info.duration),
          };

          nextStream = directSource
            ? directSource
            : buildVodUrl(
                login.url,
                login.username,
                login.password,
                contentId,
                containerExtension
              );
        }

        if (!nextStream) {
          throw new Error('Stream indisponível');
        }

        setTitle(nextTitle);
        setPosterUri(nextPoster);
        setPlot(nextPlot);
        setMeta(nextMeta);
        setStreamUrl(nextStream);

        await saveHistory({
          id: historyKey,
          name: nextTitle,
          streamUrl: nextStream,
          posterUri: nextPoster,
          progress: historyItem?.progress ?? 0,
          duration: historyItem?.duration ?? 0,
          updatedAt: Date.now(),
        });
      } catch (e) {
        console.log('Player load error:', e);
        setError('Não foi possível carregar este conteúdo.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [contentId, directStreamUrl, historyKey, initialTitle, router]);

  useEffect(() => {
    if (!streamUrl) return;

    try {
      player.replace(streamUrl);

      if (resumeTimeRef.current > 0) {
        player.currentTime = resumeTimeRef.current;
      }

      player.play();
    } catch (e) {
      console.log('Player replace error:', e);
      setError('O player não conseguiu iniciar o vídeo.');
    }
  }, [player, streamUrl]);

  useEffect(() => {
    if (!streamUrl || !historyKey) return;

    const currentTime = Math.max(0, Math.floor(playbackTime.currentTime));
    if (currentTime <= 0) return;

    void updateProgress(historyKey, currentTime, player.duration);
  }, [historyKey, playbackTime.currentTime, player.duration, streamUrl]);

  useEffect(() => {
    return () => {
      if (!historyKey || !streamUrl) return;
      void updateProgress(historyKey, player.currentTime, player.duration);
      player.pause();
    };
  }, [historyKey, player, streamUrl]);

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Preparando player...</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }

  const isPlayerError = playerStatus.status === 'error';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <VideoView
        player={player}
        style={styles.playerShell}
        allowsFullscreen
        allowsPictureInPicture
        nativeControls
      />

      <LinearGradient
        colors={['rgba(0,0,0,0.75)', 'transparent', 'rgba(0,0,0,0.85)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </Pressable>

          <View style={styles.resumePill}>
            <Text style={styles.resumeText}>
              {resumeSeconds > 0
                ? `Retomando em ${formatClock(resumeSeconds)}`
                : 'Novo'}
            </Text>
          </View>
        </View>

        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.poster} />
        ) : null}

        <Text style={styles.title}>{title}</Text>

        <Text style={styles.metaLine}>
          {[meta.year || 'N/A', meta.rating || '0.0', meta.duration]
            .filter(Boolean)
            .join(' | ')}
        </Text>

        {isPlayerError || error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardText}>
              {error ||
                'O player encontrou um erro ao carregar este conteúdo.'}
            </Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Sinopse</Text>
          <Text style={styles.plot}>{plot}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090C',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#09090C',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: '#FCA5A5',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 32,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 10,
    borderRadius: 14,
  },
  resumePill: {
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderColor: 'rgba(124,58,237,0.38)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  resumeText: {
    color: '#E9D5FF',
    fontSize: 12,
    fontWeight: '700',
  },
  playerShell: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#141418',
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 18,
    marginBottom: 18,
    alignSelf: 'flex-start',
  },
  title: {
    color: '#FFF',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  metaLine: {
    color: '#C7C7D1',
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  errorCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
  },
  errorCardText: {
    color: '#FECACA',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  infoCard: {
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 18,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  plot: {
    color: '#B6B6C3',
    fontSize: 15,
    lineHeight: 24,
  },
});    rating?: string | number;
    duration?: string | number;
    movie_image?: string;
    cover_big?: string;
    stream_icon?: string;
    container_extension?: string;
    direct_source?: string;
  };
  movie_data?: {
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
};

const cleanString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const displayValue = (value: unknown) => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const formatClock = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }

  return `${minutes}:${String(rest).padStart(2, '0')}`;
};

const getHistoryKey = (
  kind: string,
  id: string,
  seriesId?: string,
  episodeId?: string,
  streamUrl?: string
) => {
  if (kind === 'series' && seriesId && episodeId) {
    return `series:${seriesId}:${episodeId}`;
  }

  return id || streamUrl || 'playback';
};

export default function Player() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const contentId = typeof params.id === 'string' ? params.id : '';
  const kind = typeof params.kind === 'string' ? params.kind : 'vod';
  const seriesId = typeof params.seriesId === 'string' ? params.seriesId : '';
  const episodeId = typeof params.episodeId === 'string' ? params.episodeId : '';
  const directStreamUrl = typeof params.streamUrl === 'string' ? params.streamUrl : '';
  const initialTitle = typeof params.title === 'string' ? params.title : '';
  const initialPoster = typeof params.posterUri === 'string' ? params.posterUri : '';
  const initialPlot = typeof params.plot === 'string' ? params.plot : '';
  const initialYear = typeof params.year === 'string' ? params.year : '';
  const initialRating = typeof params.rating === 'string' ? params.rating : '';
  const initialDuration = typeof params.duration === 'string' ? params.duration : '';

  const historyKey = getHistoryKey(kind, contentId, seriesId, episodeId, directStreamUrl);

  const [streamUrl, setStreamUrl] = useState(directStreamUrl || '');
  const [loading, setLoading] = useState(!directStreamUrl);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialTitle || 'Conteudo');
  const [posterUri, setPosterUri] = useState(initialPoster);
  const [plot, setPlot] = useState(initialPlot || 'Sem sinopse disponivel.');
  const [meta, setMeta] = useState({
    year: initialYear,
    rating: initialRating,
    duration: initialDuration,
  });
  const [resumeSeconds, setResumeSeconds] = useState(0);
  const [externalEnabled, setExternalEnabled] = useState(false);
  const resumeTimeRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.login);

        if (!stored) {
          router.replace('/');
          return;
        }

        const login = JSON.parse(stored) as LoginData;
        setExternalEnabled(await getExternalPlayerEnabled());

        const history = await getHistory();
        const historyItem = history.find((item) => item.id === historyKey || item.id === contentId);
        resumeTimeRef.current = historyItem?.progress ?? 0;
        setResumeSeconds(historyItem?.progress ?? 0);

        let nextTitle =
          initialTitle ||
          historyItem?.name ||
          'Conteudo';
        let nextPoster =
          initialPoster ||
          historyItem?.posterUri ||
          '';
        let nextPlot = initialPlot || 'Sem sinopse disponivel.';
        let nextMeta = {
          year: initialYear,
          rating: initialRating,
          duration: initialDuration,
        };
        let nextStream = directStreamUrl;

        if (!nextStream) {
          if (kind === 'series' && seriesId && episodeId) {
            nextStream = buildSeriesEpisodeUrl(
              login.url,
              login.username,
              login.password,
              episodeId,
              'mp4'
            );
          } else {
            if (!contentId) {
              throw new Error('Id invalido');
            }

            const vodInfo = await getIptvData(
              login.url,
              login.username,
              login.password,
              'get_vod_info',
              {
                vod_id: contentId,
              }
            );

            const response = (vodInfo ?? {}) as VodResponse;
            const movie = response.movie_data ?? {};
            const info = response.info ?? {};
            const directSource =
              cleanString(movie.direct_source) || cleanString(info.direct_source);
            const containerExtension =
              cleanString(movie.container_extension) ||
              cleanString(info.container_extension) ||
              'mp4';

            nextTitle =
              initialTitle ||
              cleanString(movie.name) ||
              cleanString(info.name) ||
              nextTitle;
            nextPoster = getPosterUri(
              movie.movie_image,
              info.movie_image,
              movie.cover_big,
              info.cover_big,
              movie.stream_icon,
              info.stream_icon,
              nextPoster
            );
            nextPlot =
              initialPlot ||
              cleanString(movie.plot) ||
              cleanString(info.plot) ||
              nextPlot;
            nextMeta = {
              year: initialYear || displayValue(movie.year) || displayValue(info.year),
              rating:
                initialRating || displayValue(movie.rating) || displayValue(info.rating),
              duration:
                initialDuration ||
                displayValue(movie.duration) ||
                displayValue(info.duration),
            };

            nextStream = directSource
              ? directSource
              : buildVodUrl(
                  login.url,
                  login.username,
                  login.password,
                  contentId,
                  containerExtension
                );
          }
        }

        if (!nextStream) {
          throw new Error('Stream indisponivel');
        }

        setTitle(nextTitle);
        setPosterUri(nextPoster);
        setPlot(nextPlot);
        setMeta(nextMeta);
        setStreamUrl(nextStream);

        void saveHistory({
          id: historyKey,
          name: nextTitle,
          streamUrl: nextStream,
          posterUri: nextPoster,
          progress: historyItem?.progress ?? 0,
          duration: historyItem?.duration ?? 0,
          updatedAt: Date.now(),
        });
      } catch {
        setError('Nao foi possivel carregar este conteudo.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [contentId, directStreamUrl, episodeId, historyKey, initialDuration, initialPlot, initialPoster, initialRating, initialTitle, initialYear, kind, router, seriesId]);

  const player = useVideoPlayer(streamUrl || null, (p) => {
    if (!streamUrl) return;

    p.timeUpdateEventInterval = 5;
    p.staysActiveInBackground = false;

    if (resumeTimeRef.current > 0) {
      p.currentTime = resumeTimeRef.current;
    }

    p.play();
  });

  const playerStatus = useEvent(player, 'statusChange', {
    status: player.status,
  });

  const playbackTime = useEvent(player, 'timeUpdate', {
    currentTime: resumeTimeRef.current,
    bufferedPosition: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
  });

  useEffect(() => {
    if (!streamUrl || !historyKey) return;

    const currentTime = Math.max(0, Math.floor(playbackTime.currentTime));
    if (currentTime <= 0) return;

    void updateProgress(historyKey, currentTime, player.duration);
  }, [historyKey, playbackTime.currentTime, player.duration, streamUrl]);

  useEffect(() => {
    return () => {
      if (!historyKey || !streamUrl) return;
      void updateProgress(historyKey, player.currentTime, player.duration);
      player.pause();
    };
  }, [historyKey, player, streamUrl]);

  const handleExternal = async () => {
    if (!streamUrl) return;
    await openInExternalPlayer(streamUrl);
  };

  if (loading || !streamUrl) {
    return (
      <LinearGradient colors={['#09090C', '#111117', '#09090C']} style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Preparando player...</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </LinearGradient>
    );
  }

  const isPlayerError = playerStatus.status === 'error';

  return (
    <LinearGradient colors={['#09090C', '#111117', '#09090C']} style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.backdrop}>
        <Image source={{ uri: posterUri }} style={styles.backdropImage} blurRadius={26} />
        <LinearGradient
          colors={['rgba(9,9,12,0.16)', 'rgba(9,9,12,0.92)']}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.resumePill}>
            <Text style={styles.resumeText}>
              {resumeSeconds > 0 ? `Retomando em ${formatClock(resumeSeconds)}` : 'Novo'}
            </Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.metaLine}>
          {[meta.year || 'N/A', meta.rating || '0.0', meta.duration]
            .filter(Boolean)
            .join(' | ')}
        </Text>

        {isPlayerError || error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color="#FCA5A5" />
            <Text style={styles.errorCardText}>
              {error || 'O player encontrou um erro ao carregar este conteudo.'}
            </Text>
          </View>
        ) : null}

        <View style={styles.playerShell}>
          {!isPlayerError ? (
            <>
              <VideoView
                player={player}
                style={StyleSheet.absoluteFillObject}
                nativeControls
                contentFit="contain"
                allowsFullscreen
                showsTimecodes={false}
              />

              {playerStatus.status === 'loading' ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.posterFallback}>
              <Image source={{ uri: posterUri }} style={styles.posterFallbackImage} />
              <LinearGradient
                colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.88)']}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.posterFallbackTitle}>{title}</Text>
              <Text style={styles.posterFallbackText}>
                Tente novamente ou volte para o catalogo.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Sinopse</Text>
          <Text style={styles.plot}>{plot}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.externalBtn} onPress={handleExternal}>
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text style={styles.externalBtnText}>
              {externalEnabled ? 'Abrir no player externo' : 'Abrir em player externo'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090C',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: '#FCA5A5',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 32,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 10,
    borderRadius: 14,
  },
  resumePill: {
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderColor: 'rgba(124,58,237,0.38)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  resumeText: {
    color: '#E9D5FF',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  metaLine: {
    color: '#C7C7D1',
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  errorCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  errorCardText: {
    flex: 1,
    color: '#FECACA',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  playerShell: {
    marginTop: 18,
    aspectRatio: 16 / 9,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  posterFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111114',
    padding: 16,
  },
  posterFallbackImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  posterFallbackTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  posterFallbackText: {
    color: '#D4D4D8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  infoCard: {
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 18,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  plot: {
    color: '#B6B6C3',
    fontSize: 15,
    lineHeight: 24,
  },
  actions: {
    marginTop: 18,
  },
  externalBtn: {
    backgroundColor: '#1F1F28',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2B2B36',
  },
  externalBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
});
