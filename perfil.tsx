import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { clearCache } from '@/src/lib/cache';
import {
  getExternalPlayerEnabled,
  getParentalLockEnabled,
  getParentalPin,
  setExternalPlayerEnabled,
  setParentalLockEnabled,
  setParentalPin,
  setUnlockedParentalSession,
} from '@/src/lib/settings';

type PinMode = 'set' | 'change';

export default function Perfil() {
  const router = useRouter();
  const [parentalLock, setParentalLock] = useState(false);
  const [externalPlayer, setExternalPlayer] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [pinExists, setPinExists] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinMode, setPinMode] = useState<PinMode>('set');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    void carregarPreferencias();
  }, []);

  const carregarPreferencias = async () => {
    try {
      const login = await AsyncStorage.getItem('@iptv_login');
      const externalPref = await getExternalPlayerEnabled();
      const parentalPref = await getParentalLockEnabled();
      const pin = await getParentalPin();

      if (login) setUserData(JSON.parse(login));
      setExternalPlayer(externalPref);
      setParentalLock(parentalPref);
      setPinExists(Boolean(pin));
    } catch (error) {
      console.error('Erro ao carregar preferencias', error);
    }
  };

  const handleToggleExternalPlayer = async (value: boolean) => {
    setExternalPlayer(value);
    await setExternalPlayerEnabled(value);
  };

  const openPinModal = (mode: PinMode) => {
    setPinMode(mode);
    setPin('');
    setPinConfirm('');
    setPinError('');
    setPinModalVisible(true);
  };

  const handleToggleParentalLock = async (value: boolean) => {
    setParentalLock(value);
    await setParentalLockEnabled(value);

    if (value && !pinExists) {
      openPinModal('set');
    }

    if (!value) {
      await setUnlockedParentalSession(false);
    }
  };

  const savePin = async () => {
    const nextPin = pin.trim();
    const nextConfirm = pinConfirm.trim();

    if (nextPin.length < 4) {
      setPinError('Use pelo menos 4 digitos.');
      return;
    }

    if (nextPin !== nextConfirm) {
      setPinError('Os PINs nao conferem.');
      return;
    }

    await setParentalPin(nextPin);
    await setParentalLockEnabled(true);
    await setUnlockedParentalSession(false);

    setPinExists(true);
    setParentalLock(true);
    setPinModalVisible(false);
  };

  const limparCacheTemporario = async () => {
    Alert.alert(
      'Limpar cache',
      'Isso vai remover historico e listas temporarias carregadas no aparelho. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            await clearCache();
            await setUnlockedParentalSession(false);
            Alert.alert('Sucesso', 'Cache limpo com sucesso.');
          },
        },
      ]
    );
  };

  const logout = async () => {
    Alert.alert('Sair', 'Deseja desconectar sua conta KingIPTV?', [
      { text: 'Ficar' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await setUnlockedParentalSession(false);
          await AsyncStorage.removeItem('@iptv_login');
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minha Conta</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <FontAwesome5 name="user-crown" size={26} color="#7C3AED" />
          </View>
          <View>
            <Text style={styles.userName}>{userData?.username || 'Usuario King'}</Text>
            <Text style={styles.userStatus}>Assinatura ativa</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>PREFERENCIAS</Text>
        <View style={styles.menuGroup}>
          <View style={styles.option}>
            <View style={styles.optionLeft}>
              <MaterialCommunityIcons name="play-box-outline" size={24} color="#7C3AED" />
              <View>
                <Text style={styles.optionText}>Player Externo</Text>
                <Text style={styles.optionSub}>Abrir stream em app externo</Text>
              </View>
            </View>
            <Switch
              value={externalPlayer}
              onValueChange={handleToggleExternalPlayer}
              trackColor={{ false: '#333', true: '#7C3AED' }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.option, styles.divider]}>
            <View style={styles.optionLeft}>
              <MaterialCommunityIcons name="shield-lock" size={24} color="#7C3AED" />
              <View>
                <Text style={styles.optionText}>Bloqueio Parental</Text>
                <Text style={styles.optionSub}>Ocultar conteudo 18+</Text>
              </View>
            </View>
            <Switch
              value={parentalLock}
              onValueChange={handleToggleParentalLock}
              trackColor={{ false: '#333', true: '#7C3AED' }}
              thumbColor="#fff"
            />
          </View>

          <Pressable
            style={[styles.menuItem, styles.divider]}
            onPress={() => openPinModal(pinExists ? 'change' : 'set')}
          >
            <View style={styles.optionLeft}>
              <Ionicons name="key-outline" size={22} color="#7C3AED" />
              <View>
                <Text style={styles.menuText}>
                  {pinExists ? 'Alterar PIN' : 'Definir PIN'}
                </Text>
                <Text style={styles.optionSub}>
                  {pinExists ? 'Atualize o codigo de acesso' : 'Crie um PIN para liberar 18+'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#444" />
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>MANUTENCAO</Text>
        <View style={styles.menuGroup}>
          <Pressable style={styles.menuItem} onPress={limparCacheTemporario}>
            <View style={styles.optionLeft}>
              <Ionicons name="flash-outline" size={22} color="#EAB308" />
              <View>
                <Text style={styles.menuText}>Limpar Cache</Text>
                <Text style={styles.optionSub}>Remove historico e listas temporarias</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#444" />
          </Pressable>
        </View>

        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>SAIR DA CONTA</Text>
        </Pressable>

        <Text style={styles.version}>KingIPTV v2.0.4</Text>
      </ScrollView>

      <Modal
        visible={pinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {pinMode === 'change' ? 'Alterar PIN' : 'Definir PIN'}
            </Text>
            <Text style={styles.modalText}>
              {pinMode === 'change'
                ? 'Escolha um novo PIN para os conteudos bloqueados.'
                : 'Crie um PIN para liberar conteudos 18+.'}
            </Text>

            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={setPin}
              placeholder="Novo PIN"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />

            <TextInput
              style={styles.pinInput}
              value={pinConfirm}
              onChangeText={setPinConfirm}
              placeholder="Confirmar PIN"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />

            {!!pinError && <Text style={styles.pinError}>{pinError}</Text>}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setPinModalVisible(false)}
              >
                <Text style={styles.modalBtnGhostText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalBtn} onPress={savePin}>
                <Text style={styles.modalBtnText}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 25,
    backgroundColor: '#0B0B0F',
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    backgroundColor: '#141418',
    padding: 20,
    borderRadius: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#1C1C22',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#7C3AED22',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7C3AED44',
  },
  userName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userStatus: { color: '#22C55E', fontSize: 12, fontWeight: '600', marginTop: 2 },
  sectionLabel: {
    color: '#444',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 10,
    marginLeft: 5,
    letterSpacing: 1,
  },
  menuGroup: {
    backgroundColor: '#141418',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#1C1C22',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#1C1C22',
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  optionText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  optionSub: { color: '#666', fontSize: 12, marginTop: 2 },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
  },
  menuText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    padding: 18,
    borderRadius: 15,
    backgroundColor: '#EF444411',
    borderWidth: 1,
    borderColor: '#EF444422',
  },
  logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 14 },
  version: {
    textAlign: 'center',
    color: '#333',
    fontSize: 10,
    marginTop: 20,
    letterSpacing: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#141418',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1C1C22',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  modalText: {
    color: '#A0A0AB',
    marginTop: 10,
    lineHeight: 20,
  },
  pinInput: {
    marginTop: 14,
    backgroundColor: '#0F0F14',
    borderRadius: 14,
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'center',
    letterSpacing: 5,
    fontSize: 18,
  },
  pinError: {
    color: '#FCA5A5',
    marginTop: 10,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  modalBtn: {
    flex: 1,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
  modalBtnGhost: {
    backgroundColor: '#22222A',
  },
  modalBtnGhostText: {
    color: '#fff',
    fontWeight: '700',
  },
});
