import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

const PLANOS = [
  { id: 1, nome: 'Mensal', preco: '24,90', desc: 'Acesso completo por 30 dias', icon: 'crown' },
  { id: 2, nome: 'Trimestral', preco: '49,90', desc: 'Acesso completo por 90 dias', pop: true, icon: 'star' },
  { id: 3, nome: 'Renovação', preco: '', desc: 'Pra você que já é nosso cliente', icon: 'history' },
];

export default function PlanosPremium() {
  const router = useRouter();

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        
        {/* HEADER COM BOTÃO VOLTAR */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#7C3AED" />
          </Pressable>
          <Text style={styles.title}>Escolha seu <Text style={{color: '#7C3AED'}}>Plano</Text></Text>
        </View>

        <Text style={styles.subTitle}>Libere acesso imediato a todo o conteúdo 4K</Text>
        
        {PLANOS.map(plano => (
          <View key={plano.id} style={[styles.card, plano.pop && styles.popCard]}>
            {plano.pop && (
              <LinearGradient 
                colors={['#7C3AED', '#5b21b6']} 
                start={{x:0, y:0}} end={{x:1, y:0}} 
                style={styles.popBadge}
              >
                <Text style={styles.popBadgeText}>MAIS VENDIDO</Text>
              </LinearGradient>
            )}
            
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.planName}>{plano.nome}</Text>
                <Text style={styles.planDesc}>{plano.desc}</Text>
              </View>
              <FontAwesome5 name={plano.icon} size={24} color={plano.pop ? "#7C3AED" : "#333"} />
            </View>

            {/* LÓGICA DE PREÇO */}
            <View style={styles.priceRow}>
              {plano.preco !== '' ? (
                <>
                  <Text style={styles.currency}>R$</Text>
                  <Text style={styles.planPrice}>{plano.preco}</Text>
                </>
              ) : (
                <Text style={styles.planPrice}>Consultar</Text>
              )}
            </View>

            <Pressable 
              style={({ pressed }) => [
                styles.btn, 
                { opacity: pressed ? 0.8 : 1 },
                plano.pop ? styles.btnPop : styles.btnRegular
              ]} 
              onPress={() => router.push({ 
                pathname: '/pagamento', 
                params: { 
                  valor: plano.preco ? plano.preco : 'A combinar', 
                  plano: plano.nome 
                } 
              })}
            >
              <Text style={styles.btnText}>RENOVAR ASSINATURA</Text>
              <FontAwesome5 name="arrow-right" size={14} color="#fff" style={{marginLeft: 10}} />
            </Pressable>
          </View>
        ))}

        <View style={styles.footerInfo}>
          <FontAwesome5 name="lock" size={12} color="#666" />
          <Text style={styles.footerText}>Pagamento 100% seguro via PIX</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#0B0B0F' },
  container: { flex: 1, padding: 20 },
  header: { marginTop: 50, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  backBtn: { backgroundColor: '#141418', padding: 10, borderRadius: 12, marginRight: 15, borderWidth: 1, borderColor: '#1C1C22' },
  title: { color: '#fff', fontSize: 26, fontWeight: '900' },
  subTitle: { color: '#666', fontSize: 14, marginBottom: 30, marginLeft: 2 },
  card: { backgroundColor: '#141418', padding: 25, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: '#1C1C22', overflow: 'hidden' },
  popCard: { borderColor: '#7C3AED', borderWidth: 2, backgroundColor: '#161225' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  popBadge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 15, paddingVertical: 5, borderBottomLeftRadius: 15 },
  popBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  planName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  planDesc: { color: '#888', fontSize: 13, marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 25, minHeight: 45 },
  currency: { color: '#7C3AED', fontSize: 18, fontWeight: 'bold', marginRight: 5 },
  planPrice: { color: '#fff', fontSize: 38, fontWeight: '900' },
  btn: { padding: 18, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnRegular: { backgroundColor: '#1C1C22', borderWidth: 1, borderColor: '#333' },
  btnPop: { backgroundColor: '#7C3AED' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  footerInfo: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, gap: 10 },
  footerText: { color: '#666', fontSize: 12 }
});