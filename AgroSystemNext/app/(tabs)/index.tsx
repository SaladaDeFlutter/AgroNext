import * as React from 'react';
import { StyleSheet, View, Platform, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { Text, Surface, Provider as PaperProvider, TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Leaf, FileText, LogOut, Route as RouteIcon, UserPlus } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, getFullHeaders } from '@/src/config/api';
import { AppColors } from '@/constants/theme';

const GREEN_MAIN = AppColors.green;
const BG_DARK = AppColors.bg;
const CARD_DARK = AppColors.card;

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = React.useState('');
  const [registerVisible, setRegisterVisible] = React.useState(false);
  const [regName, setRegName] = React.useState('');
  const [regEmail, setRegEmail] = React.useState('');
  const [regPass, setRegPass] = React.useState('');
  const [regLoading, setRegLoading] = React.useState(false);

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

  const registerSeller = async () => {
    if (!regName.trim() || !regEmail.trim() || !regPass.trim()) {
      return Alert.alert('Erro', 'Preencha todos os campos');
    }
    setRegLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = await getFullHeaders(token || undefined);
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/register`, {
        method: 'POST', headers, body: JSON.stringify({
          name: regName.trim(), email: regEmail.trim(), password: regPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao cadastrar');
      Alert.alert('Sucesso', `${regName.trim()} cadastrado como vendedor`);
      setRegisterVisible(false);
      setRegName(''); setRegEmail(''); setRegPass('');
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setRegLoading(false);
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

          <TouchableOpacity onPress={() => setRegisterVisible(true)}>
            <Surface style={styles.card} elevation={2}>
              <View style={[styles.cardIcon, { backgroundColor: '#1a4a2e' }]}>
                <UserPlus size={28} color={GREEN_MAIN} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Cadastrar Vendedor</Text>
                <Text style={styles.cardDescription}>
                  Adicione um novo vendedor ao sistema
                </Text>
              </View>
            </Surface>
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={registerVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Surface style={styles.modalContent} elevation={5}>
              <Text style={styles.modalTitle}>Cadastrar Vendedor</Text>

              <TextInput label="Nome" value={regName} onChangeText={setRegName}
                mode="outlined" style={styles.modalInput}
                outlineColor={AppColors.border} activeOutlineColor={AppColors.green}
                textColor={AppColors.text} />

              <TextInput label="Email" value={regEmail} onChangeText={setRegEmail}
                autoCapitalize="none" mode="outlined" style={styles.modalInput}
                outlineColor={AppColors.border} activeOutlineColor={AppColors.green}
                textColor={AppColors.text} />

              <TextInput label="Senha" value={regPass} onChangeText={setRegPass}
                secureTextEntry mode="outlined" style={styles.modalInput}
                outlineColor={AppColors.border} activeOutlineColor={AppColors.green}
                textColor={AppColors.text} />

              <Button mode="contained" onPress={registerSeller} loading={regLoading}
                buttonColor={AppColors.green} style={styles.modalBtn}>
                Cadastrar
              </Button>
              <Button mode="text" onPress={() => setRegisterVisible(false)}
                textColor={AppColors.textMid}>
                Cancelar
              </Button>
            </Surface>
          </View>
        </Modal>

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
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', padding: 24,
  },
  modalContent: {
    backgroundColor: AppColors.card, borderRadius: 16, padding: 24,
  },
  modalTitle: {
    fontSize: 20, fontWeight: 'bold', color: AppColors.text, marginBottom: 20, textAlign: 'center',
  },
  modalInput: {
    backgroundColor: AppColors.inputBg, marginBottom: 12,
  },
  modalBtn: {
    borderRadius: 8, marginTop: 8,
  },
});
