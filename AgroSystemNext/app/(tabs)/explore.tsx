import * as React from 'react';
import { StyleSheet, View, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, Provider as PaperProvider, Button, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Key, ChevronRight, Leaf, Users, Check, Copy, LogIn } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppColors } from '@/constants/theme';
import { getFullHeaders } from '@/src/config/api';

export default function SettingsTabScreen() {
  const router = useRouter();
  const [userName, setUserName] = React.useState('');
  const [teamId, setTeamId] = React.useState('');
  const [inviteCode, setInviteCode] = React.useState('');
  const [teamInput, setTeamInput] = React.useState('');
  const [joinInput, setJoinInput] = React.useState('');
  const [tokenCount, setTokenCount] = React.useState(0);
  const [savingTeam, setSavingTeam] = React.useState(false);
  const [joining, setJoining] = React.useState(false);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    try {
      const [profileRes, inviteRes] = await Promise.all([
        fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/profile`, {
          headers: await getFullHeaders(token),
        }),
        fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/team/invite`, {
          headers: await getFullHeaders(token),
        }),
      ]);
      const profile = await profileRes.json();
      if (profile.data?.name) setUserName(profile.data.name);
      if (profile.data?.teamId) {
        setTeamId(profile.data.teamId);
        setTeamInput(profile.data.teamId);
      }
      const invite = await inviteRes.json();
      if (invite.data?.inviteCode) setInviteCode(invite.data.inviteCode);
    } catch (_) {}
    const tokens = await AsyncStorage.getItem('asaas_tokens');
    if (tokens) setTokenCount(JSON.parse(tokens).length);
  };

  const saveTeam = async () => {
    setSavingTeam(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = await getFullHeaders(token || undefined);
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/team`, {
        method: 'PATCH', headers, body: JSON.stringify({ teamId: teamInput.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTeamId(teamInput.trim());
      setInviteCode(data.data?.inviteCode || '');
      Alert.alert('Time atualizado', data.data?.inviteCode
        ? `Compartilhe o código com seu time: ${data.data.inviteCode}`
        : 'Time removido');
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setSavingTeam(false);
    }
  };

  const joinTeam = async () => {
    if (!joinInput.trim()) return;
    setJoining(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = await getFullHeaders(token || undefined);
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/team/join`, {
        method: 'POST', headers, body: JSON.stringify({ inviteCode: joinInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTeamId(data.data.teamId);
      setTeamInput(data.data.teamId);
      setJoinInput('');
      Alert.alert('Time', 'Você entrou no time!');
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setJoining(false);
    }
  };

  const copyInvite = () => {
    if (inviteCode) {
      navigator.clipboard?.writeText?.(inviteCode);
      Alert.alert('Copiado', inviteCode);
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

          <Surface style={styles.card} elevation={2}>
            <View style={[styles.cardIcon, { backgroundColor: '#1a2a3a' }]}>
              <Users size={24} color={AppColors.green} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Time</Text>
              <Text style={styles.cardDescription}>
                {teamId ? `Time: ${teamId}` : 'Sem time'}
              </Text>
            </View>
          </Surface>

          <Text style={styles.sectionLabel}>
            {teamId ? 'Alterar time' : 'Criar time'}
          </Text>
          <TextInput
            label="Nome do time"
            value={teamInput}
            onChangeText={setTeamInput}
            mode="outlined"
            style={styles.input}
            outlineColor={AppColors.border}
            activeOutlineColor={AppColors.green}
            textColor={AppColors.text}
            placeholder="Ex: equipe-01"
            placeholderTextColor={AppColors.textMid}
          />
          <Button
            mode="contained"
            onPress={saveTeam}
            loading={savingTeam}
            buttonColor={AppColors.green}
            style={styles.actionBtn}
          >
            {teamId ? 'Atualizar time' : 'Criar time'}
          </Button>

          {inviteCode ? (
            <Surface style={styles.inviteBox} elevation={1}>
              <Text style={styles.inviteLabel}>Código de convite</Text>
              <View style={styles.inviteRow}>
                <Text style={styles.inviteCode}>{inviteCode}</Text>
                <TouchableOpacity onPress={copyInvite} style={styles.copyBtn}>
                  <Copy size={18} color={AppColors.green} />
                </TouchableOpacity>
              </View>
              <Text style={styles.inviteHint}>
                Compartilhe este código com quem quiser adicionar ao time
              </Text>
            </Surface>
          ) : null}

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            Entrar em um time
          </Text>
          <TextInput
            label="Código de convite"
            value={joinInput}
            onChangeText={setJoinInput}
            mode="outlined"
            style={styles.input}
            outlineColor={AppColors.border}
            activeOutlineColor={AppColors.green}
            textColor={AppColors.text}
            placeholder="Cole o código aqui"
            placeholderTextColor={AppColors.textMid}
          />
          <Button
            mode="contained"
            onPress={joinTeam}
            loading={joining}
            buttonColor={AppColors.green}
            style={styles.actionBtn}
            icon={() => <LogIn size={18} color="#fff" />}
          >
            Entrar no time
          </Button>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AppColors.bg },
  header: {
    backgroundColor: AppColors.green,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30, alignItems: 'center',
  },
  logoCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  userName: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  content: { flex: 1, padding: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 12, backgroundColor: AppColors.card, marginBottom: 16,
  },
  cardIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: AppColors.text, marginBottom: 2 },
  cardDescription: { fontSize: 13, color: AppColors.textMid },
  sectionLabel: {
    fontSize: 14, fontWeight: '600', color: AppColors.text, marginBottom: 8,
  },
  input: { backgroundColor: AppColors.inputBg, marginBottom: 10 },
  actionBtn: { borderRadius: 8, marginBottom: 16 },
  inviteBox: {
    backgroundColor: AppColors.card, borderRadius: 12, padding: 16, marginBottom: 16,
  },
  inviteLabel: { fontSize: 13, color: AppColors.textMid, marginBottom: 8 },
  inviteRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: AppColors.inputBg,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
  },
  inviteCode: {
    flex: 1, fontSize: 18, fontWeight: 'bold', color: AppColors.green,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
  },
  copyBtn: { padding: 8 },
  inviteHint: { fontSize: 12, color: AppColors.textMid, marginTop: 8 },
  logoutButton: { alignItems: 'center', paddingVertical: 16, marginTop: 20 },
  logoutText: { color: '#e57373', fontSize: 16, fontWeight: '600' },
});
