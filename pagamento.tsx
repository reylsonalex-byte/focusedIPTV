import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Image, Linking, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

// Certifique-se de que as imagens estão na pasta app/images/
import imgMensal from './images/qrcode-mensal.png';
import imgRenovacao from './images/qrcode-renovacao.png';
import imgTrimestral from './images/qrcode-trimestral.png';

export default function TelaPagamento() {
  // Ajustado para receber 'valor' (vindo do planos.tsx) e 'plano'
  const { valor, plano } = useLocalSearchParams();
  const router = useRouter();

  const qrCodes: { [key: string]: any } = {
    'Mensal': imgMensal,
    'Trimestral': imgTrimestral,
    'Renovação': imgRenovacao,
  };

  const qrImagem = qrCodes[plano as string] || imgMensal;

  const enviarComprovante = () => {
    const telefone = "5511999999999"; // Coloque seu número real aqui
    const msg = `Olá! Acabei de realizar o pagamento do plano ${plano}. Segue o comprovante abaixo:`;
    Linking.openURL(`https://wa.me/${telefone}?text=${encodeURIComponent(msg)}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Pagamento PIX</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Plano Selecionado:</Text>
          <Text style={styles.infoValue}>{plano}</Text>
          <View style={styles.divider} />
          <Text style={styles.infoLabel}>Valor a pagar:</Text>
          <Text style={styles.priceValue}>R$ {valor}</Text>
        </View>

        <View style={styles.qrContainer}>
          <View style={styles.qrFrame}>
            <Image 
              source={qrImagem} 
              style={styles.qrImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.qrTitle}>Escaneie para pagar</Text>
          <Text style={styles.qrStep}>Após o pagamento, clique no botão abaixo para enviar o comprovante no WhatsApp.</Text>
        </View>

        <Pressable style={styles.supportBtn} onPress={enviarComprovante}>
          <FontAwesome5 name="whatsapp" size={20} color="#fff" />
          <Text style={styles.supportText}>Enviar Comprovante</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  scrollContent: { padding: 25, alignItems: 'center' },
  header: { width: '100%', marginTop: 50, flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backBtn: { backgroundColor: '#1C1C22', padding: 10, borderRadius: 12, marginRight: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  infoCard: { width: '100%', backgroundColor: '#141418', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#1C1C22', marginBottom: 30 },
  infoLabel: { color: '#666', fontSize: 12 },
  infoValue: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  divider: { height: 1, backgroundColor: '#1C1C22', marginBottom: 15 },
  priceValue: { color: '#7C3AED', fontSize: 28, fontWeight: '900' },
  qrContainer: { alignItems: 'center', width: '100%' },
  qrFrame: { backgroundColor: '#fff', padding: 10, borderRadius: 20, marginBottom: 15 },
  qrImage: { width: 220, height: 220 },
  qrTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  qrStep: { color: '#888', textAlign: 'center', fontSize: 14, paddingHorizontal: 20 },
  supportBtn: { flexDirection: 'row', backgroundColor: '#25D366', padding: 18, borderRadius: 16, width: '100%', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 30 },
  supportText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});