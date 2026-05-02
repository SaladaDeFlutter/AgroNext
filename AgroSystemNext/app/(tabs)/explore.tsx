import * as React from 'react';
import { StyleSheet, View, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Surface, Provider as PaperProvider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Key, ChevronRight, Leaf } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppColors } from '@/constants/theme';
import { getFullHeaders } from '@/src/config/api';

export default function SettingsTabScreen() {
  const router = useRouter();
  const [userName, setUserName] = React.useState('');
  const [tokenCount, setTokenCount] = React.useState(0);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/profile`, {
          headers: await getFullHeaders(token || undefined),
        });
        const data = await response.json();
        if (data.data?.name) setUserName(data.data.name);
      } catch (_) {}
    }
    const tokens = await AsyncStorage.getItem('asaas_tokens');
    if (tokens) {
      setTokenCount(JSON.parse(tokens).length);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/');
  };

  return (
    <PaperProvider>
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Leaf size={32} color={AppColors.green} />
          </View>
          <Text style={styles.headerTitle}>Configurações</Text>
          {userName ? <Text style={styles.userName}>{userName}</Text> : null}
        </View>

        <ScrollView style={styles.content}>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Surface style={styles.card} elevation={2}>
              <View style={[styles.cardIcon, { backgroundColor: '#1a4a2e' }]}>
                <Key size={24} color={AppColors.green} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Chaves da API</Text>
                <Text style={styles.cardDescription}>
                  {tokenCount > 0 ? `${tokenCount} chave(s) configurada(s)` : 'Nenhuma chave configurada'}
                </Text>
              </View>
              <ChevronRight size={20} color={AppColors.textMid} />
            </Surface>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  header: {
    backgroundColor: AppColors.green,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    alignItems: 'center',
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: AppColors.card,
    marginBottom: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: AppColors.textMid,
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 20,
  },
  logoutText: {
    color: '#e57373',
    fontSize: 16,
    fontWeight: '600',
  },
});
