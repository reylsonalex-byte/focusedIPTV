import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
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
import { VideoView, useVideoPlayer } from 'expo-video';

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
  const [loading, setLoading] = useState(!directStreamUrl);
  const [error, setError] = useState<string | null>(null);

  const player = useVideoPlayer(null, (p) => {
    p.timeUpdateEventInterval = 5;
    p.staysActiveInBackground = false;
  });

  const playerStatus = useEvent(player, 'statusChange', {
    status: player.status,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem('@iptv_login');

        if (!stored) {
          router.replace('/');
          return;
        }

        const login = JSON.parse(stored) as LoginData;

        const nextStream =
          directStreamUrl ||
          buildLiveUrl(
            login.url,
            login.username,
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
