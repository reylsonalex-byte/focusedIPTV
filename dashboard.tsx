import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ContentPoster } from '@/components/content-poster';
import { loadCatalog, loadShortEpg, type CatalogMode, type LoginData } from '@/src/lib/catalog';
import { getHistory, type HistoryItem } from '@/src/lib/history';
import { getMediaCategory, getMediaId, getMediaPoster, getMediaTitle, isAdultContent, type MediaBase } from '@/src/lib/content';
import { getPosterUri } from '@/src/lib/media';
import { pushProtectedRoute } from '@/src/lib/navigation';
import {
  getExternalPlayerEnabled,
  getParentalLockEnabled,
  getUnlockedParentalSession,
  STORAGE_KEYS,
} from '@/src/lib/settings';

type ModeConfig = {
  label: string;
  badge: string;
  subtitle: string;
};

const MODES: Record<CatalogMode, ModeConfig> = {
  live: {
    label: 'Canais de TV',
    badge: 'EPG',
    subtitle: 'Guia ao vivo',
  },
  vod: {
    label: 'Filmes',
    badge: 'FILME',
    subtitle: 'Estilo Netflix',
  },
  series: {
    label: 'Series',
    badge: 'SERIE',
    subtitle: 'Estilo Netflix',
  },
};

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

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

const uniqueCategories = (items: MediaBase[]) => [
  'Todos',
  ...Array.from(
    new Set(
      items
        .map((item) => getMediaCategory(item))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ),
];

const groupByCategory = (items: MediaBase[]) => {
  const groups = new Map<string, MediaBase[]>();

  for (const item of items) {
    const key = getMediaCategory(item);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return Array.from(groups.entries()).map(([title, data]) => ({
    title,
    data,
  }));
};

const getEpgEntry = (epgList: unknown[]) => {
  if (!Array.isArray(epgList) || epgList.length === 0) return null;
  const entry = epgList[0];
  return entry && typeof entry === 'object' ? (entry as Record<string, any>) : null;
};

const formatEpgRange = (entry: Record<string, any> | null) => {
  if (!entry) return 'Sem grade disponivel';

  const start = Number(entry.start_timestamp);
  const stop = Number(entry.stop_timestamp);

  if (!Number.isFinite(start) || !Number.isFinite(stop) || stop <= start) {
    return normalizeText(entry.start || entry.stop) || 'Agora';
  }

  return `${formatClock(start % 86400)} - ${formatClock(stop % 86400)}`;
};

export default function Dashboard() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [login, setLogin] = useState<LoginData | null>(null);
  const [mode, setMode] = useState<CatalogMode>('live');
  const [catalogs, setCatalogs] = useState<Record<CatalogMode, MediaBase[]>>({
    live: [],
    vod: [],
    series: [],
  });
  const [loadingMode, setLoadingMode] = useState<Record<CatalogMode, boolean>>({
    live: false,
    vod: false,
    series: false,
  });
  const [errorMode, setErrorMode] = useState<Record<CatalogMode, string | null>>({
    live: null,
    vod: null,
    series: null,
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Record<CatalogMode, string>>({
    live: 'Todos',
    vod: 'Todos',
    series: 'Todos',
  });
  const [selectedLiveId, setSelectedLiveId] = useState('');
  const [selectedEpg, setSelectedEpg] = useState<Record<string, any> | null>(null);
  const [epgLoading, setEpgLoading] = useState(false);
  const [parentalLock, setParentalLock] = useState(false);
  const [parentalUnlocked, setParentalUnlocked] = useState(false);
  const [externalPlayerEnabled, setExternalPlayerEnabledState] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.login);

        if (!stored) {
          router.replace('/');
          return;
        }

        setLogin(JSON.parse(stored) as LoginData);
      } catch {
        router.replace('/');
        return;
      } finally {
        setReady(true);
      }
    };

    void init();
  }, [router]);

  const refreshPrefs = useCallback(async () => {
    const [lock, unlocked, external] = await Promise.all([
      getParentalLockEnabled(),
      getUnlockedParentalSession(),
      getExternalPlayerEnabled(),
    ]);

    setParentalLock(lock);
    setParentalUnlocked(unlocked);
    setExternalPlayerEnabledState(external);
  }, []);

  const refreshHistory = useCallback(async () => {
    setHistory(await getHistory());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPrefs();
      void refreshHistory();
    }, [refreshHistory, refreshPrefs])
  );

  const loadMode = useCallback(
    async (target: CatalogMode, force = false) => {
      if (!login) return;

      try {
        setLoadingMode((current) => ({ ...current, [target]: true }));
        setErrorMode((current) => ({ ...current, [target]: null }));

        const items = await loadCatalog(target, login, !force);
        setCatalogs((current) => ({ ...current, [target]: items }));

        if (target === 'live' && items.length > 0) {
          setSelectedLiveId((current) => current || getMediaId(items[0]));
        }
      } catch {
        setErrorMode((current) => ({
          ...current,
          [target]: 'Falha ao carregar o catalogo.',
        }));
      } finally {
        setLoadingMode((current) => ({ ...current, [target]: false }));
      }
    },
    [login]
  );

  useEffect(() => {
    if (!ready || !login) return;
    void loadMode(mode);
  }, [loadMode, login, mode, ready]);

  const items = catalogs[mode];
  const categories = useMemo(() => uniqueCategories(items), [items]);
  const activeCategory = selectedCategory[mode];
  const filteredItems = useMemo(() => {
    if (activeCategory === 'Todos') return items;
    return items.filter((item) => getMediaCategory(item) === activeCategory);
  }, [activeCategory, items]);

  const groupedItems = useMemo(() => {
    if (mode === 'live') return [];

    if (activeCategory !== 'Todos') {
      return [{ title: activeCategory, data: filteredItems }];
    }

    return groupByCategory(filteredItems).slice(0, 6);
  }, [activeCategory, filteredItems, mode]);

  const selectedLive = useMemo(() => {
    if (mode !== 'live') return null;
    return (
      filteredItems.find((item) => getMediaId(item) === selectedLiveId) ??
      filteredItems[0] ??
      null
    );
  }, [filteredItems, mode, selectedLiveId]);

  useEffect(() => {
    if (mode !== 'live' || !login || !selectedLive) {
      setSelectedEpg(null);
      return;
    }

    let active = true;

    const loadEpg = async () => {
      try {
        setEpgLoading(true);
        const epg = await loadShortEpg(login, getMediaId(selectedLive), 1);
        if (!active) return;
        setSelectedEpg(getEpgEntry(epg));
      } finally {
        if (active) setEpgLoading(false);
      }
    };

    void loadEpg();

    return () => {
      active = false;
    };
  }, [login, mode, selectedLive]);

  useEffect(() => {
    if (mode !== 'live' || filteredItems.length === 0) return;
    if (!selectedLiveId || !filteredItems.some((item) => getMediaId(item) === selectedLiveId)) {
      setSelectedLiveId(getMediaId(filteredItems[0]));
    }
  }, [filteredItems, mode, selectedLiveId]);

  const openContent = (item: MediaBase, targetMode: CatalogMode) => {
    const adult = isAdultContent(item);
    const requiresPin = parentalLock && !parentalUnlocked && adult;

    if (targetMode === 'live') {
      pushProtectedRoute(
        '/live-player',
        {
          id: getMediaId(item),
          name: getMediaTitle(item),
          posterUri: getMediaPoster(item),
        },
        requiresPin
      );
      return;
    }

    pushProtectedRoute(
      '/detalhes',
      {
        id: getMediaId(item),
        name: getMediaTitle(item),
        kind: targetMode,
        posterUri: getMediaPoster(item),
      },
      requiresPin
    );
  };

  const movieHistory = history.filter((item) => item.streamUrl);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const currentConfig = MODES[mode];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.brand}>KING IPTV</Text>
          <Text style={styles.subtitle}>{currentConfig.subtitle}</Text>

          <View style={styles.modeBar}>
            {(Object.keys(MODES) as CatalogMode[]).map((key) => {
              const config = MODES[key];
              const active = key === mode;

              return (
                <Pressable
                  key={key}
                  style={[styles.modeButton, active && styles.modeButtonActive]}
                  onPress={() => setMode(key)}
                >
                  <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>
                    {config.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {mode !== 'live' && movieHistory.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Continuar Assistindo</Text>
            <FlatList
              horizontal
              data={movieHistory}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.historyRow}
              renderItem={({ item }) => (
                <ContentPoster
                  title={item.name}
                  posterUri={item.posterUri || getPosterUri()}
                  onPress={() =>
                    pushProtectedRoute(
                      '/player',
                      {
                        streamUrl: item.streamUrl,
                        title: item.name,
                        posterUri: item.posterUri,
                      },
                      parentalLock && !parentalUnlocked && false
                    )
                  }
                  style={styles.historyCard}
                  compact
                  titleLines={2}
                  progress={
                    item.duration > 0
                      ? Math.min((item.progress / item.duration) * 100, 100)
                      : 0
                  }
                  badgeLabel="REC"
                />
              )}
            />
          </View>
        ) : null}

        {loadingMode[mode] ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : errorMode[mode] ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Catalogo indisponivel</Text>
            <Text style={styles.emptyText}>{errorMode[mode]}</Text>
            <Pressable style={styles.retryBtn} onPress={() => void loadMode(mode, true)}>
              <Text style={styles.retryText}>Recarregar</Text>
            </Pressable>
          </View>
        ) : mode === 'live' ? (
          <View style={styles.modeBody}>
            <View style={styles.featureCard}>
              <View style={styles.featurePosterWrap}>
                <Image
                  source={{ uri: getPosterUri(getMediaPoster(selectedLive ?? {})) }}
                  style={styles.featurePoster}
                />
                <View style={styles.livePill}>
                  <Text style={styles.livePillText}>AO VIVO</Text>
                </View>
              </View>

              <View style={styles.featureCopy}>
                <Text style={styles.featureEyebrow}>EPG</Text>
                <Text style={styles.featureTitle}>
                  {selectedLive ? getMediaTitle(selectedLive) : 'Selecione um canal'}
                </Text>
                <Text style={styles.featureMeta}>
                  {selectedLive ? getMediaCategory(selectedLive) : 'Sem canal selecionado'}
                </Text>
                <Text style={styles.featureSubtitle}>
                  {selectedEpg ? normalizeText(selectedEpg.title || selectedEpg.name) : 'Toque em um canal para ver a programação.'}
                </Text>
                <Text style={styles.featurePlot}>
                  {selectedEpg ? normalizeText(selectedEpg.description || selectedEpg.info) : 'Use a lista abaixo para navegar como um guia EPG.'}
                </Text>

                <View style={styles.featureActions}>
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() => selectedLive && openContent(selectedLive, 'live')}
                  >
                    <Text style={styles.primaryBtnText}>Assistir</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.categoryRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((category) => {
                  const active = category === activeCategory;
                  return (
                    <Pressable
                      key={category}
                      style={[styles.categoryChip, active && styles.categoryChipActive]}
                      onPress={() =>
                        setSelectedCategory((current) => ({ ...current, [mode]: category }))
                      }
                    >
                      <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                        {category}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.liveList}>
              {filteredItems.map((item) => {
                const selected = getMediaId(item) === getMediaId(selectedLive ?? {});
                const adult = parentalLock && !parentalUnlocked && isAdultContent(item);

                return (
                  <Pressable
                    key={getMediaId(item)}
                    style={[styles.liveRow, selected && styles.liveRowActive]}
                    onPress={() => setSelectedLiveId(getMediaId(item))}
                  >
                    <View style={styles.liveLogoWrap}>
                      <Image
                        source={{ uri: getPosterUri(getMediaPoster(item)) }}
                        style={styles.liveLogo}
                      />
                    </View>

                    <View style={styles.liveTextWrap}>
                      <Text style={styles.liveName} numberOfLines={1}>
                        {getMediaTitle(item)}
                      </Text>
                      <Text style={styles.liveInfo} numberOfLines={1}>
                        {adult ? 'Bloqueado por PIN' : 'Toque para ver o guia EPG'}
                      </Text>
                    </View>

                    <Pressable
                      style={styles.livePlayBtn}
                      onPress={() => openContent(item, 'live')}
                    >
                      <Text style={styles.livePlayBtnText}>Play</Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.modeBody}>
            <View style={styles.featureCard}>
              <View style={styles.featurePosterWrap}>
                <Image
                  source={{ uri: getPosterUri(getMediaPoster(filteredItems[0] ?? {})) }}
                  style={styles.featurePoster}
                />
              </View>

              <View style={styles.featureCopy}>
                <Text style={styles.featureEyebrow}>{currentConfig.subtitle}</Text>
                <Text style={styles.featureTitle}>
                  {filteredItems[0] ? getMediaTitle(filteredItems[0]) : 'Sem titulos'}
                </Text>
                <Text style={styles.featureMeta}>
                  {filteredItems[0] ? getMediaCategory(filteredItems[0]) : 'Carregue o catalogo'}
                </Text>
                <Text style={styles.featurePlot}>
                  Navegue por categorias com o estilo Netflix. Toque em qualquer card para abrir os detalhes.
                </Text>

                <View style={styles.featureActions}>
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() => filteredItems[0] && openContent(filteredItems[0], mode)}
                  >
                    <Text style={styles.primaryBtnText}>Abrir destaque</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.categoryRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((category) => {
                  const active = category === activeCategory;
                  return (
                    <Pressable
                      key={category}
                      style={[styles.categoryChip, active && styles.categoryChipActive]}
                      onPress={() =>
                        setSelectedCategory((current) => ({ ...current, [mode]: category }))
                      }
                    >
                      <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                        {category}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {groupedItems.length === 0 ? (
              <View style={styles.emptyStateInline}>
                <Text style={styles.emptyTitle}>Sem titulos</Text>
                <Text style={styles.emptyText}>
                  Tente atualizar a lista ou revisar os dados da conta.
                </Text>
              </View>
            ) : (
              groupedItems.map((group) => (
                <View key={group.title} style={styles.railSection}>
                  <View style={styles.railHeader}>
                    <Text style={styles.railTitle}>{group.title}</Text>
                    <Text style={styles.railCount}>{group.data.length} itens</Text>
                  </View>

                  <FlatList
                    horizontal
                    data={group.data.slice(0, 12)}
                    keyExtractor={(item) => getMediaId(item)}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.railRow}
                    renderItem={({ item }) => {
                      const adult = parentalLock && !parentalUnlocked && isAdultContent(item);

                      return (
                        <ContentPoster
                          title={getMediaTitle(item)}
                          posterUri={getPosterUri(getMediaPoster(item))}
                          onPress={() => openContent(item, mode)}
                          style={styles.posterCard}
                          compact
                          titleLines={2}
                          badgeLabel={adult ? '18+' : currentConfig.badge}
                        />
                      );
                    }}
                  />
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090C',
  },
  scrollContent: {
    paddingBottom: 28,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  brand: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#8A8A94',
    marginTop: 6,
    fontSize: 13,
  },
  modeBar: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#141418',
    padding: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1C1C22',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#7C3AED',
  },
  modeLabel: {
    color: '#8A8A94',
    fontSize: 12,
    fontWeight: '800',
  },
  modeLabelActive: {
    color: '#fff',
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  historyRow: {
    paddingHorizontal: 16,
  },
  historyCard: {
    width: 140,
    marginRight: 12,
  },
  modeBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  featureCard: {
    backgroundColor: '#141418',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1C1C22',
    overflow: 'hidden',
  },
  featurePosterWrap: {
    aspectRatio: 16 / 9,
    backgroundColor: '#0F0F14',
  },
  featurePoster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  livePill: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  livePillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  featureCopy: {
    padding: 18,
  },
  featureEyebrow: {
    color: '#C4B5FD',
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  featureTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
  },
  featureMeta: {
    color: '#A0A0AB',
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  featureSubtitle: {
    color: '#E5E7EB',
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
  },
  featurePlot: {
    color: '#8A8A94',
    marginTop: 8,
    lineHeight: 20,
  },
  featureActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  primaryBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '900',
  },
  categoryRow: {
    marginTop: 16,
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: '#1C1C22',
    marginRight: 10,
  },
  categoryChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  categoryChipText: {
    color: '#A0A0AB',
    fontSize: 12,
    fontWeight: '800',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  liveList: {
    paddingBottom: 60,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141418',
    borderWidth: 1,
    borderColor: '#1C1C22',
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  liveRowActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#1A1427',
  },
  liveLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F0F14',
  },
  liveLogo: {
    width: '100%',
    height: '100%',
  },
  liveTextWrap: {
    flex: 1,
  },
  liveName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  liveInfo: {
    color: '#8A8A94',
    marginTop: 4,
    fontSize: 12,
  },
  livePlayBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  livePlayBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  railSection: {
    marginTop: 16,
  },
  railHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  railTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  railCount: {
    color: '#6B7280',
    fontSize: 12,
  },
  railRow: {
    paddingRight: 8,
  },
  posterCard: {
    width: 140,
    marginRight: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  emptyStateInline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: '#8A8A94',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 18,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
