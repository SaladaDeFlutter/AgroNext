import * as React from 'react';
import { StyleSheet, View, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, Provider as PaperProvider, Button, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Key, ChevronRight, Leaf, Users, Copy, LogIn, RefreshCw, Trash2 } from 'lucide-react-native';
import storage from '@/src/config/storage';
import { AppColors } from '@/constants/theme';
import { getFullHeaders } from '@/src/config/api';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function SettingsTabScreen() {
  const router = useRouter();
  const [userName, setUserName] = React.useState('');
  const [team, setTeam] = React.useState<any>(null);
  const [teamName, setTeamName] = React.useState('');
  const [joinCode, setJoinCode] = React.useState('');
  const [tokenCount, setTokenCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const token = React.useRef<string | null>(null);
  const headers = React.useCallback(async () => getFullHeaders(token.current || undefined), []);

  React.useEffect(() => {
    (async () => {
      token.current = await storage.getItem('token');
      if (token.current) loadData();
    })();
  }, []);

  const apiFetch = async (path: string, opts?: RequestInit) => {
    const baseHeaders = await headers();
    const mergedHeaders = opts?.headers
      ? { ...baseHeaders, ...(opts.headers as Record<string, string>) }
      : baseHeaders;
    const res = await fetch(`${API}${path}`, { ...opts, headers: mergedHeaders });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data;
  };

  const loadData = async () => {
    try {
      const [profileRes, teamRes] = await Promise.all([
        apiFetch('/auth/profile'),
        apiFetch('/teams/my'),
      ]);
      if (profileRes.data?.name) setUserName(profileRes.data.name);
      setTeam(teamRes.data);
      setTeamName(teamRes.data?.name || '');
    } catch (_) {}
    const t = await storage.getItem('asaas_tokens');
    if (t) setTokenCount(JSON.parse(t).length);
  };

  const createTeam = async () => {
    if (!teamName.trim()) return Alert.alert('Erro', 'Digite um nome para a equipe');
    setLoading(true);
    try {
      const data = await apiFetch('/teams', {
        method: 'POST',
        body: JSON.stringify({ name: teamName.trim() }),
        headers: { 'Content-Type': 'application/json' },
      });
      setTeam({ ...data.data, members: [{ name: userName, role: 'admin' }], myRole: 'admin' });
      Alert.alert('Equipe criada', `Código: ${data.data.inviteCode}`);
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinTeam = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    try {
      const data = await apiFetch('/teams/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: joinCode.trim() }),
        headers: { 'Content-Type': 'application/json' },
      });
      await loadData();
      setJoinCode('');
      Alert.alert('Sucesso', `Você entrou em ${data.data.teamName}`);
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshInvite = async () => {
    try {
      const data = await apiFetch('/teams/refresh-invite', { method: 'POST' });
      setTeam((prev: any) => prev ? { ...prev, inviteCode: data.data.inviteCode } : prev);
      Alert.alert('Código renovado', data.data.inviteCode);
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    }
  };

  const removeMember = async (memberId: string, memberName: string) => {
    Alert.alert('Remover', `Remover ${memberName} da equipe?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        try {
          await apiFetch(`/teams/members/${memberId}`, { method: 'DELETE' });
          await loadData();
        } catch (err: any) { Alert.alert('Erro', err.message); }
      }},
    ]);
  };

  const copyInvite = () => {
    if (team?.inviteCode) {
      navigator.clipboard?.writeText?.(team.inviteCode);
      Alert.alert('Copiado', team.inviteCode);
    }
  };

  const handleLogout = async () => {
    await storage.removeItem('token');
    if (Platform.OS === 'web') {
      window.location.href = '/';
    } else {
      router.replace('/');
    }
  };

  const isAdmin = team?.myRole === 'admin';

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

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
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
            <View style={[styles.cardIcon, { backgroundColor: '#1a4a2e' }]}>
              <Users size={24} color={AppColors.green} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Equipe</Text>
              <Text style={styles.cardDescription}>
                {team ? team.name : 'Nenhuma equipe'}
              </Text>
            </View>
          </Surface>

          {team ? (
            <>
              {isAdmin && team.inviteCode ? (
                <Surface style={styles.inviteBox} elevation={1}>
                  <Text style={styles.inviteLabel}>Código de convite</Text>
                  <View style={styles.inviteRow}>
                    <Text style={styles.inviteCode}>{team.inviteCode}</Text>
                    <TouchableOpacity onPress={copyInvite} style={styles.iconBtn}>
                      <Copy size={18} color={AppColors.green} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={refreshInvite} style={styles.iconBtn}>
                      <RefreshCw size={18} color={AppColors.textMid} />
                    </TouchableOpacity>
                  </View>
                </Surface>
              ) : null}

              <Text style={styles.sectionTitle}>Membros</Text>
              {team.members?.map((m: any) => (
                <Surface key={m.id} style={styles.memberCard} elevation={1}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberRole}>
                      {m.role === 'admin' ? 'Administrador' : 'Membro'}
                    </Text>
                  </View>
                  {isAdmin && m.role !== 'admin' && (
                    <TouchableOpacity onPress={() => removeMember(m.id, m.name)}>
                      <Trash2 size={18} color="#e57373" />
                    </TouchableOpacity>
                  )}
                </Surface>
              ))}
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Criar equipe</Text>
              <TextInput
                label="Nome da equipe"
                value={teamName}
                onChangeText={setTeamName}
                mode="outlined"
                style={styles.input}
                outlineColor={AppColors.border}
                activeOutlineColor={AppColors.green}
                textColor={AppColors.text}
                placeholder="Ex: Vendas Norte"
                placeholderTextColor={AppColors.textMid}
              />
              <Button
                mode="contained" onPress={createTeam} loading={loading}
                buttonColor={AppColors.green} style={styles.actionBtn}
                icon={() => <Users size={18} color="#fff" />}
              >
                Criar equipe
              </Button>

              <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Entrar em uma equipe</Text>
              <TextInput
                label="Código de convite"
                value={joinCode}
                onChangeText={setJoinCode}
                mode="outlined"
                style={styles.input}
                outlineColor={AppColors.border}
                activeOutlineColor={AppColors.green}
                textColor={AppColors.text}
                placeholder="Ex: ABC1-DEF2"
                placeholderTextColor={AppColors.textMid}
              />
              <Button
                mode="contained" onPress={joinTeam} loading={loading}
                buttonColor={AppColors.green} style={styles.actionBtn}
                icon={() => <LogIn size={18} color="#fff" />}
              >
                Entrar
              </Button>
            </>
          )}
        </ScrollView>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
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
  scrollArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
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
  sectionTitle: { fontSize: 14, fontWeight: '600', color: AppColors.text, marginBottom: 8 },
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
  iconBtn: { padding: 8 },
  memberCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: AppColors.card, borderRadius: 10, padding: 14, marginBottom: 8,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: AppColors.text },
  memberRole: { fontSize: 12, color: AppColors.textMid, marginTop: 2 },
  logoutButton: { alignItems: 'center', paddingVertical: 16, marginTop: 20 },
  logoutText: { color: '#e57373', fontSize: 16, fontWeight: '600' },
});
