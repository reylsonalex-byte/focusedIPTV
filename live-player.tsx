import { Ionicons } from '@expo/vector-icons';
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
import { VideoView, useVideoPlayer } from 'expo-video';

import { buildLiveUrl } from '@/src/lib/api';
import { openInExternalPlayer } from '@/src/lib/external-player';
import { getPosterUri } from '@/src/lib/media';
import { getExternalPlayerEnabled, STORAGE_KEYS } from '@/src/lib/settings';

type LoginData = {
  url: string;
  username: string;
  password: string;
};

const cleanString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

export default function LivePlayer() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const id = typeof params.id === 'string' ? params.id : '';
  const name = typeof params.name === 'string' ? params.name : '';
  const posterUri = typeof params.posterUri === 'string' ? params.posterUri : '';
  const directStreamUrl = typeof params.streamUrl === 'string' ? params.streamUrl : '';

  const [streamUrl, setStreamUrl] = useState(directStreamUrl || '');
  const [loading, setLoading] = useState(!directStreamUrl);
  const [error, setError] = useState('');
  const [externalEnabled, setExternalEnabled] = useState(false);
  const externalAttemptedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.login);

        if (!stored) {
          router.replace('/');
          return;
        }

        const login = JSON.parse(stored) as LoginData;
        const pref = await getExternalPlayerEnabled();
        setExternalEnabled(pref);

        if (directStreamUrl) {
          setStreamUrl(directStreamUrl);
          return;
        }

        if (!id) {
          throw new Error('Id invalido');
        }

        const nextUrl = buildLiveUrl(login.url, login.username, login.password, id, 'm3u8');
        setStreamUrl(nextUrl);
      } catch {
        setError('Nao foi possivel abrir este canal.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [directStreamUrl, id, router]);

  const player = useVideoPlayer(streamUrl || null, (p) => {
    if (!streamUrl) return;

    p.timeUpdateEventInterval = 5;
    p.staysActiveInBackground = false;
    p.play();
  });

  const playerStatus = useEvent(player, 'statusChange', {
    status: player.status,
  });

  useEffect(() => {
    if (!streamUrl || !externalEnabled || externalAttemptedRef.current) return;

    externalAttemptedRef.current = true;
  }, [externalEnabled, streamUrl]);

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
          <Text style={styles.loadingText}>Abrindo canal...</Text>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#09090C', '#111117', '#09090C']} style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>

          <View style={styles.livePill}>
            <Text style={styles.livePillText}>AO VIVO</Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {cleanString(name) || 'Canal'}
        </Text>
        <Text style={styles.metaLine}>
          {externalEnabled ? 'Player externo habilitado' : 'Player interno habilitado'}
        </Text>

        <View style={styles.playerShell}>
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
        </View>

        <View style={styles.infoCard}>
          <Image source={{ uri: getPosterUri(posterUri) }} style={styles.channelPoster} />
          <View style={styles.infoText}>
            <Text style={styles.sectionTitle}>Canal ao vivo</Text>
            <Text style={styles.plot}>
              Use o player interno ou abra em um app externo como VLC/MX Player.
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.primaryBtn} onPress={handleExternal}>
            <Text style={styles.primaryBtnText}>Abrir no player externo</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090C' },
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 28,
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
  livePill: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  livePillText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  metaLine: {
    color: '#A0A0AB',
    marginTop: 8,
    fontWeight: '700',
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
  infoCard: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    backgroundColor: '#141418',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1C1C22',
    padding: 14,
  },
  channelPoster: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#0F0F14',
  },
  infoText: {
    flex: 1,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  plot: {
    color: '#A0A0AB',
    marginTop: 6,
    lineHeight: 20,
  },
  actions: {
    marginTop: 18,
  },
  primaryBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '900',
  },
});
