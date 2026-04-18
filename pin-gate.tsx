import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  getParentalPin,
  setUnlockedParentalSession,
} from '@/src/lib/settings';

const decodePayload = (value: unknown) => {
  const raw = typeof value === 'string' ? value : '';
  if (!raw) return {};

  try {
    return JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
  } catch {
    return {};
  }
};

export default function PinGate() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const next = typeof params.next === 'string' ? params.next : '';
  const payload = useMemo(() => decodePayload(params.payload), [params.payload]);

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async () => {
    try {
      setLoading(true);
      setError('');

      const storedPin = await getParentalPin();

      if (!storedPin) {
        setError('Defina um PIN nas configuracoes antes de liberar conteudos 18+.');
        return;
      }

      if (pin.trim() !== storedPin) {
        setError('PIN incorreto.');
        return;
      }

      await setUnlockedParentalSession(true);

      if (!next) {
        router.back();
        return;
      }

      router.replace({
        pathname: next as any,
        params: payload as Record<string, string>,
      });
    } catch {
      Alert.alert('Erro', 'Nao foi possivel validar o PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed" size={28} color="#fff" />
        </View>

        <Text style={styles.title}>Conteudo bloqueado</Text>
        <Text style={styles.subtitle}>
          Digite o PIN para liberar o acesso a conteudos 18+.
        </Text>

        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          placeholder="PIN"
          placeholderTextColor="#666"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleUnlock}>
          <Text style={styles.buttonText}>
            {loading ? 'Validando...' : 'LIBERAR'}
          </Text>
        </Pressable>

        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Voltar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#141418',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1C1C22',
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    marginBottom: 18,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#A0A0AB',
    marginTop: 10,
    lineHeight: 22,
  },
  input: {
    marginTop: 20,
    backgroundColor: '#0F0F14',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 18,
    letterSpacing: 6,
    textAlign: 'center',
  },
  error: {
    color: '#FCA5A5',
    marginTop: 12,
    textAlign: 'center',
  },
  button: {
    marginTop: 18,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
  },
  backBtn: {
    alignItems: 'center',
    marginTop: 14,
  },
  backText: {
    color: '#8A8A94',
  },
});
