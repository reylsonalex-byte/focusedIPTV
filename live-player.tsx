import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video from 'react-native-video';

import { buildLiveUrl } from '@/src/lib/api';

type LoginData = {
  url: string;
  username: string;
  password: string;
};

export default function LivePlayer() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const streamId = typeof params.id === 'string' ? params.id : '';
  const title = typeof params.title === 'string' ? params.title : 'Ao vivo';
  const directStreamUrl =
    typeof params.streamUrl === 'string' ? params.streamUrl : '';

  const [streamUrl, setStreamUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const enableRotation = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.ALL_BUT_UPSIDE_DOWN
        );
      } catch (e) {
        console.log('Erro ao liberar rotação no live-player:', e);
      }
    };

    void enableRotation();

    return () => {
      void ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch((e) => console.log('Erro ao restaurar portrait:', e));
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        if (directStreamUrl) {
          if (!cancelled) {
            setStreamUrl(directStreamUrl);
          }
          return  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const enableRotation = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.ALL_BUT_UPSIDE_DOWN
        );
      } catch (e) {
        console.log('Erro ao liberar rotação no live-player:', e);
      }
    };

    void enableRotation();

    return () => {
      void ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch((e) => console.log('Erro ao restaurar portrait:', e));
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        if (directStreamUrl) {
          if (!cancelled) setStreamUrl(directStreamUrl);
          return;
        }

        if (!streamId) throw new Error('Canal inválido');

        const stored = await AsyncStorage.getItem('@iptv_login');
        if (!stored) {
          router.replace('/');
          return;
        }

        const login = JSON.parse(stored) as LoginData;

        const nextStream = buildLiveUrl(
          login.url,
          login.username,
          login.password,
          streamId,
          'm3u8'
        );

        if (!nextStream) throw new Error('Canal indisponível');
        if (!cancelled) setStreamUrl(nextStream);
      } catch (e) {
        console.log('Erro live-player:', e);
        if (!cancelled) setError('Não foi possível carregar este canal.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [directStreamUrl, router, streamId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Abrindo canal premium...</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {streamUrl ? (
        <Video
          source={{ uri: streamUrl }}
          style={styles.video}
          controls
          resizeMode="contain"
          paused={paused}
          pictureInPicture
          playInBackground={false}
          playWhenInactive={false}
          onError={(e: any) => {
            console.log('live player error', e);
            setError('O player não conseguiu iniciar o canal.');
          }}
        />
      ) : null}

      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent', 'rgba(0,0,0,0.70)']}
        style={styles.overlay}
        pointerEvents="none"
      />

      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </Pressable>

        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.livePillText}>AO VIVO • ROTAÇÃO ATIVA</Text>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.bottomCard}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          <Text style={styles.subtitle}>
            Canal em reprodução com interface premium e rotação automática.
          </Text>

          <View style={styles.controlsRow}>
            <Pressable
              style={styles.smallControl}
              onPress={() => setPaused((v) => !v)}
            >
              <Ionicons
                name={paused ? 'play-outline' : 'pause-outline'}
                size={18}
                color="#FFF"
              />
              <Text style={styles.smallControlText}>
                {paused ? 'Retomar' : 'Pausar'}
              </Text>
            </Pressable>
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTextCard}>{error}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    backgroundColor: '#09090C',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  errorText: {
    color: '#FCA5A5',
    marginTop: 8,
    textAlign: 'center',
  },
  video: { flex: 1, backgroundColor: '#111' },
  overlay: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderColor: 'rgba(124,58,237,0.36)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#EF4444',
  },
  livePillText: {
    color: '#E9D5FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 26,
  },
  bottomCard: {
    backgroundColor: 'rgba(9,9,12,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    padding: 16,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: '#CFCFDC',
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  controlsRow: {
    marginTop: 14,
    flexDirection: 'row',
  },
  smallControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  smallControlText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorCard: {
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
  },
  errorTextCard: {
    color: '#FECACA',
    fontWeight: '600',
    lineHeight: 19,
  },
});            login.username,
            login.password,
            streamId,
            'm3u8'
          );

        if (!nextStream) {
          throw new Error('Canal indisponível');
        }

        setStreamUrl(nextStream);
      } catch (e) {
        console.log('Erro live-player:', e);
        setError('Não foi possível carregar este canal.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [directStreamUrl, router, streamId]);

  useEffect(() => {
    if (!streamUrl) return;

    try {
      player.replace(streamUrl);
      player.play();
    } catch (e) {
      console.log('Erro ao iniciar live:', e);
      setError('O player não conseguiu iniciar o canal.');
    }
  }, [player, streamUrl]);

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Abrindo canal...</Text>
      </View>
    );
  }

  const isPlayerError = playerStatus.status === 'error';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <VideoView
        player={player}
        style={styles.video}
        allowsFullscreen
        allowsPictureInPicture
        nativeControls
      />

      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </Pressable>
      </View>

      <View style={styles.bottomBar}>
        <Text style={styles.title}>{title}</Text>

        {isPlayerError || error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error || 'O player encontrou um erro ao carregar este canal.'}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    backgroundColor: '#09090C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#FFF',
    fontWeight: '700',
  },
  video: {
    flex: 1,
    backgroundColor: '#111',
  },
  topBar: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 26,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
  },
  errorCard: {
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
  },
  errorText: {
    color: '#FECACA',
    fontWeight: '600',
  },
});
