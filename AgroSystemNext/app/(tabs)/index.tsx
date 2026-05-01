import * as React from 'react';
import { StyleSheet, View, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Surface, Provider as PaperProvider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Leaf, FileText, LogOut, Route as RouteIcon } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/src/config/api';
import { AppColors } from '@/constants/theme';

const GREEN_MAIN = AppColors.green;
const BG_DARK = AppColors.bg;
const CARD_DARK = AppColors.card;

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = React.useState('');

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const result = await api.auth.getProfile(token);
          if (result.data?.name) {
            setUserName(result.data.name);
          }
        }
      } catch (error) {
        console.log('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/');
  };

  return (
    <PaperProvider>
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Leaf size={36} color={GREEN_MAIN} />
          </View>
          <Text style={styles.appName}>AgroSystem</Text>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.welcomeText}>
            Olá, <Text style={styles.userName}>{userName || 'Usuário'}</Text>
          </Text>

          <TouchableOpacity onPress={() => router.push('/create-route')}>
            <Surface style={styles.card} elevation={2}>
              <View style={[styles.cardIcon, { backgroundColor: '#1a4a2e' }]}>
                <RouteIcon size={28} color={GREEN_MAIN} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Criar Rota</Text>
                <Text style={styles.cardDescription}>
                  Crie uma nova rota de venda
                </Text>
              </View>
            </Surface>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/reports')}>
            <Surface style={styles.card} elevation={2}>
              <View style={styles.cardIcon}>
                <FileText size={28} color={GREEN_MAIN} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Relatórios</Text>
                <Text style={styles.cardDescription}>
                  Visualize e gerencie seus relatórios agrícolas
                </Text>
              </View>
            </Surface>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#e57373" />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
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
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
    padding: 20,
  },
  welcomeText: {
    fontSize: 20,
    color: '#f0f0f0',
    marginBottom: 24,
    marginTop: 10,
  },
  userName: {
    fontWeight: 'bold',
    color: GREEN_MAIN,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    backgroundColor: CARD_DARK,
    marginBottom: 16,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a2e22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f0f0f0',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#a0a0a0',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  logoutText: {
    color: '#e57373',
    fontSize: 16,
    fontWeight: '600',
  },
});
