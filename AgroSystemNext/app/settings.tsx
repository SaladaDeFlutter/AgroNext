import * as React from 'react';
import { StyleSheet, View, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, TextInput, Button, Provider as PaperProvider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ArrowLeft, Key, Plus, X, Check, Eye, EyeOff } from 'lucide-react-native';
import { getAllTokens, saveTokens, AsaasToken } from '@/src/config/api';
import { AppColors } from '@/constants/theme';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function maskToken(token: string): string {
  if (token.length <= 8) return token;
  return token.slice(0, 4) + '••••' + token.slice(-4);
}

export default function SettingsScreen() {
  const router = useRouter();
  const [tokens, setTokens] = React.useState<AsaasToken[]>([]);
  const [newName, setNewName] = React.useState('');
  const [newToken, setNewToken] = React.useState('');
  const [showToken, setShowToken] = React.useState(false);
  const [showAddForm, setShowAddForm] = React.useState(false);

  React.useEffect(() => { loadTokens(); }, []);

  const loadTokens = async () => {
    const all = await getAllTokens();
    setTokens(all);
  };

  const addToken = async () => {
    if (!newName.trim() || !newToken.trim()) {
      Alert.alert('Erro', 'Preencha nome e token');
      return;
    }
    const updated: AsaasToken[] = [
      ...tokens,
      { id: generateId(), name: newName.trim(), token: newToken.trim(), active: true, createdAt: new Date().toISOString() },
    ];
    await saveTokens(updated);
    setTokens(updated);
    setNewName('');
    setNewToken('');
    setShowAddForm(false);
  };

  const removeToken = (id: string) => {
    Alert.alert('Remover token', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          const updated = tokens.filter(t => t.id !== id);
          await saveTokens(updated);
          setTokens(updated);
        },
      },
    ]);
  };

  const toggleActive = async (id: string) => {
    const updated = tokens.map(t => t.id === id ? { ...t, active: !t.active } : t);
    await saveTokens(updated);
    setTokens(updated);
  };

  return (
    <PaperProvider>
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configurações</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Chaves da API Asaas</Text>
          <Text style={styles.sectionDesc}>
            Adicione uma ou mais chaves de API do Asaas. Chaves ativas serão usadas em todas as requisições.
          </Text>

          {tokens.map(t => (
            <Surface key={t.id} style={styles.tokenCard} elevation={2}>
              <View style={styles.tokenHeader}>
                <Key size={18} color={AppColors.green} />
                <Text style={styles.tokenName}>{t.name}</Text>
                <TouchableOpacity onPress={() => toggleActive(t.id)} style={styles.statusBadge}>
                  <Text style={[styles.statusText, t.active ? styles.activeText : styles.inactiveText]}>
                    {t.active ? 'Ativo' : 'Inativo'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.tokenValue}>{maskToken(t.token)}</Text>
              <Text style={styles.tokenDate}>
                Adicionado em {new Date(t.createdAt).toLocaleDateString('pt-BR')}
              </Text>
              <TouchableOpacity onPress={() => removeToken(t.id)} style={styles.removeButton}>
                <X size={16} color="#e57373" />
                <Text style={styles.removeText}>Remover</Text>
              </TouchableOpacity>
            </Surface>
          ))}

          {showAddForm ? (
            <Surface style={styles.addCard} elevation={2}>
              <TextInput
                label="Nome (ex: Asaas Principal)"
                value={newName}
                onChangeText={setNewName}
                mode="outlined"
                style={styles.input}
                outlineColor={AppColors.border}
                activeOutlineColor={AppColors.green}
                textColor={AppColors.text}
              />
              <View style={styles.tokenInputRow}>
                <TextInput
                  label="Token de acesso"
                  value={newToken}
                  onChangeText={setNewToken}
                  secureTextEntry={!showToken}
                  mode="outlined"
                  style={[styles.input, { flex: 1 }]}
                  outlineColor={AppColors.border}
                  activeOutlineColor={AppColors.green}
                  textColor={AppColors.text}
                />
                <TouchableOpacity onPress={() => setShowToken(!showToken)} style={styles.eyeButton}>
                  {showToken ? <EyeOff size={20} color={AppColors.textMid} /> : <Eye size={20} color={AppColors.textMid} />}
                </TouchableOpacity>
              </View>
              <View style={styles.addActions}>
                <Button mode="contained" onPress={addToken} buttonColor={AppColors.green} style={styles.addBtn}>
                  <Check size={18} color="#fff" /> Salvar
                </Button>
                <Button mode="text" onPress={() => setShowAddForm(false)} textColor={AppColors.textMid}>
                  Cancelar
                </Button>
              </View>
            </Surface>
          ) : (
            <Button
              mode="outlined"
              onPress={() => setShowAddForm(true)}
              textColor={AppColors.green}
              style={styles.addButton}
              icon={() => <Plus size={20} color={AppColors.green} />}
            >
              Adicionar chave da API
            </Button>
          )}
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
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AppColors.text,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 13,
    color: AppColors.textMid,
    marginBottom: 20,
    lineHeight: 18,
  },
  tokenCard: {
    backgroundColor: AppColors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tokenName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: AppColors.inputBg,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: { color: AppColors.green },
  inactiveText: { color: AppColors.textMid },
  tokenValue: {
    fontSize: 14,
    color: AppColors.textMid,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  tokenDate: {
    fontSize: 12,
    color: AppColors.textMid,
    marginBottom: 8,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeText: {
    color: '#e57373',
    fontSize: 13,
  },
  addCard: {
    backgroundColor: AppColors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  input: {
    backgroundColor: AppColors.inputBg,
  },
  tokenInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeButton: {
    padding: 8,
  },
  addActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  addBtn: {
    borderRadius: 8,
  },
  addButton: {
    borderColor: AppColors.green,
    borderRadius: 12,
    marginTop: 4,
  },
});
