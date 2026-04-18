import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();

  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!url.trim() || !username.trim() || !password.trim()) {
      return;
    }

    try {
      setLoading(true);

      await AsyncStorage.setItem(
        '@iptv_login',
        JSON.stringify({
          url: url.trim().replace(/\/+$/, ''),
          username: username.trim(),
          password: password.trim(),
        })
      );

      router.replace('/(tabs)/dashboard');
    } catch (e) {
      console.log('Erro ao salvar login:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>
          FOCUSED <Text style={styles.brandAccent}>IPTV</Text>
        </Text>

        <Text style={styles.subtitle}>
          Acesse sua conta com uma experiência premium.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="DNS / URL do painel"
          placeholderTextColor="#7A7A85"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Usuário"
          placeholderTextColor="#7A7A85"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#7A7A85"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090C',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#13131A',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1F1F28',
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  brandAccent: {
    color: '#7C3AED',
  },
  subtitle: {
    color: '#A1A1AA',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#1B1B24',
    borderWidth: 1,
    borderColor: '#252532',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
