import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const normalizePortalUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  return /^https?:\/\//i.test(trimmed)
    ? trimmed.replace(/\/+$/, '')
    : `http://${trimmed.replace(/\/+$/, '')}`;
};

export default function Login() {
  const router = useRouter();

  const [url, setUrl] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const normalizedUrl = normalizePortalUrl(url);
    const normalizedUser = user.trim();
    const normalizedPass = pass.trim();

    if (!normalizedUrl || !normalizedUser || !normalizedPass) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    try {
      setLoading(true);

      const data = {
        url: normalizedUrl,
        username: normalizedUser,
        password: normalizedPass,
      };

      await AsyncStorage.setItem('@iptv_login', JSON.stringify(data));

      router.replace('/(tabs)/dashboard');
    } catch {
      Alert.alert('Erro', 'Falha ao salvar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>KING IPTV</Text>

      <TextInput
        style={styles.input}
        placeholder="DNS http://..."
        placeholderTextColor="#666"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        value={url}
        onChangeText={setUrl}
      />

      <TextInput
        style={styles.input}
        placeholder="Usuario"
        placeholderTextColor="#666"
        autoCapitalize="none"
        autoCorrect={false}
        value={user}
        onChangeText={setUser}
      />

      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Senha"
          placeholderTextColor="#666"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          value={pass}
          onChangeText={setPass}
        />

        <Pressable
          onPress={() => setShowPassword((value) => !value)}
          style={styles.eyeBtn}
          hitSlop={10}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color="#fff"
          />
          <Text style={styles.eyeText}>
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </Text>
        </Pressable>
      </View>

      <Pressable style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>
          {loading ? 'Entrando...' : 'ENTRAR'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#1A1A22',
    padding: 14,
    borderRadius: 10,
    color: '#fff',
    marginBottom: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
  },
  eyeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#23232D',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 10,
    marginLeft: 10,
  },
  eyeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#7C3AED',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
