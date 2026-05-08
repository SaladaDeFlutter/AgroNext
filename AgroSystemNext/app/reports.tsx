import * as React from 'react';
import { StyleSheet, View, Platform, Pressable, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Surface, Provider as PaperProvider, ActivityIndicator } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Route as RouteIcon, Calendar, User, FileText, MapPin } from 'lucide-react-native';
import storage from '@/src/config/storage';

const GREEN_MAIN = '#15B86A';
const BG_DARK = '#0d0d0d';
const CARD_DARK = '#1f1f1f';
const INPUT_BG = '#2a2a2a';
const TEXT_LIGHT = '#f0f0f0';
const TEXT_MID = '#a0a0a0';
const BORDER_GREY = '#404040';

interface RouteData {
  id: string;
  name: string;
  month: number;
  year: number;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  _count?: {
    clients: number;
  };
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function ReportsScreen() {
  const router = useRouter();
  const [routes, setRoutes] = React.useState<RouteData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadRoutes();
    }, [])
  );

  const loadRoutes = async () => {
    try {
      const token = await storage.getItem('token');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/routes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.status === 'success' && data.data) {
        const sortedRoutes = data.data.sort(
          (a: RouteData, b: RouteData) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRoutes(sortedRoutes);
      }
    } catch (err) {
      console.error('Error loading routes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRoutes();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <PaperProvider>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#fff" />
          </Pressable>
          <View style={styles.logoCircle}>
            <FileText size={36} color={GREEN_MAIN} />
          </View>
          <Text style={styles.appName}>Relatórios</Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={GREEN_MAIN}
              colors={[GREEN_MAIN]}
            />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={GREEN_MAIN} />
              <Text style={styles.loadingText}>Carregando rotas...</Text>
            </View>
          ) : routes.length === 0 ? (
            <Surface style={styles.emptyCard} elevation={2}>
              <View style={styles.emptyIcon}>
                <RouteIcon size={48} color={TEXT_MID} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma rota encontrada</Text>
              <Text style={styles.emptySubtitle}>
                Crie sua primeira rota para começar
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/create-route')}
              >
                <Text style={styles.createButtonText}>Criar Rota</Text>
              </TouchableOpacity>
            </Surface>
          ) : (
            <>
              <Text style={styles.listTitle}>
                {routes.length} rota(s) encontrada(s)
              </Text>
              {routes.map((route) => (
                <TouchableOpacity 
                  key={route.id} 
                  activeOpacity={0.8}
                  onPress={() => router.push(`/route/${route.id}`)}
                >
                  <Surface style={styles.routeCard} elevation={2}>
                    <View style={styles.routeHeader}>
                      <View style={styles.routeIconContainer}>
                        <RouteIcon size={24} color={GREEN_MAIN} />
                      </View>
                      <View style={styles.routeInfo}>
                        <Text style={styles.routeName}>{route.name}</Text>
                        <View style={styles.routeMeta}>
                          <Calendar size={14} color={TEXT_MID} />
                          <Text style={styles.routeDate}>
                            {MONTH_NAMES[route.month - 1]} / {route.year}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.routeDivider} />

                    <View style={styles.routeFooter}>
                      <View style={styles.routeFooterItem}>
                        <User size={16} color={TEXT_MID} />
                        <Text style={styles.routeFooterText}>{route.user.name}</Text>
                      </View>
                      
                    </View>

                    <Text style={styles.routeCreatedAt}>
                      Criado em {formatDate(route.createdAt)}
                    </Text>
                  </Surface>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={[styles.greenBar, { width: '30%' }]} />
          <View style={[styles.greyBar, { width: '20%' }]} />
          <View style={[styles.greenBar, { width: '10%' }]} />
        </View>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  header: {
    backgroundColor: GREEN_MAIN,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 65 : 45,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    color: TEXT_MID,
    fontSize: 16,
    marginTop: 16,
  },
  emptyCard: {
    borderRadius: 20,
    padding: 40,
    backgroundColor: CARD_DARK,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: INPUT_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: TEXT_MID,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: GREEN_MAIN,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listTitle: {
    fontSize: 14,
    color: TEXT_MID,
    marginBottom: 16,
  },
  routeCard: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: CARD_DARK,
    marginBottom: 14,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(21, 184, 106, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
    marginBottom: 6,
  },
  routeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeDate: {
    fontSize: 14,
    color: TEXT_MID,
  },
  routeDivider: {
    height: 1,
    backgroundColor: BORDER_GREY,
    marginVertical: 14,
  },
  routeFooter: {
    flexDirection: 'row',
    gap: 24,
  },
  routeFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeFooterText: {
    fontSize: 13,
    color: TEXT_MID,
  },
  routeCreatedAt: {
    fontSize: 11,
    color: TEXT_MID,
    marginTop: 12,
    opacity: 0.7,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 4,
  },
  greenBar: {
    height: 4,
    borderRadius: 4,
    backgroundColor: GREEN_MAIN,
  },
  greyBar: {
    height: 4,
    borderRadius: 4,
    backgroundColor: BORDER_GREY,
  },
});
