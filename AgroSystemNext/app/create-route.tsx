import * as React from 'react';
import { StyleSheet, View, Platform, Pressable, ScrollView, Modal, TouchableOpacity, Animated } from 'react-native';
import { TextInput, Button, Text, Surface, Provider as PaperProvider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ArrowLeft, Route as RouteIcon, ChevronDown, User, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GREEN_MAIN = '#15B86A';
const BG_DARK = '#0d0d0d';
const CARD_DARK = '#1f1f1f';
const INPUT_BG = '#2a2a2a';
const TEXT_LIGHT = '#f0f0f0';
const TEXT_MID = '#a0a0a0';
const BORDER_GREY = '#404040';

interface Seller {
  id: string;
  name: string;
  email: string;
}

export default function CreateRouteScreen() {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [month, setMonth] = React.useState('');
  const [year, setYear] = React.useState('');
  const [selectedSeller, setSelectedSeller] = React.useState<Seller | null>(null);
  const [sellers, setSellers] = React.useState<Seller[]>([]);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/users/sellers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log('Sellers response:', data);
      setSellers(data.data || []);
    } catch (err) {
      console.error('Error loading sellers:', err);
    }
  };

  const handleCreate = async () => {
    setError('');

    if (!name.trim()) {
      setError('Nome da rota é obrigatório.');
      return;
    }
    if (!month || isNaN(parseInt(month)) || parseInt(month) < 1 || parseInt(month) > 12) {
      setError('Mês inválido (1-12).');
      return;
    }
    if (!year || isNaN(parseInt(year)) || year.length !== 4) {
      setError('Ano inválido (4 dígitos).');
      return;
    }
    if (!selectedSeller) {
      setError('Selecione um vendedor.');
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/routes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          month: parseInt(month),
          year: parseInt(year),
          userId: selectedSeller.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar rota');
      }

      alert('Rota criada com sucesso!');
      router.back();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar rota');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaperProvider>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={22} color="#fff" />
            </Pressable>
            <View style={styles.logoCircle}>
              <RouteIcon size={36} color={GREEN_MAIN} />
            </View>
            <Text style={styles.appName}>Nova Rota</Text>
          </View>

          <Surface style={styles.card} elevation={2}>
            <Text style={styles.cardTitle}>Criar Rota de Venda</Text>
            <Text style={styles.cardSubtitle}>
              Preencha as informações da rota
            </Text>

            <TextInput
              label="Nome da Rota"
              value={name}
              onChangeText={setName}
              style={[styles.input, { backgroundColor: INPUT_BG }]}
              mode="outlined"
              outlineColor={BORDER_GREY}
              activeOutlineColor={GREEN_MAIN}
              textColor={TEXT_LIGHT}
              placeholderTextColor={TEXT_MID}
              placeholder="Ex: Rota de Janeiro"
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  label="Mês"
                  value={month}
                  onChangeText={setMonth}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={[styles.input, { backgroundColor: INPUT_BG }]}
                  mode="outlined"
                  outlineColor={BORDER_GREY}
                  activeOutlineColor={GREEN_MAIN}
                  textColor={TEXT_LIGHT}
                  placeholderTextColor={TEXT_MID}
                  placeholder="1-12"
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  label="Ano"
                  value={year}
                  onChangeText={setYear}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={[styles.input, { backgroundColor: INPUT_BG }]}
                  mode="outlined"
                  outlineColor={BORDER_GREY}
                  activeOutlineColor={GREEN_MAIN}
                  textColor={TEXT_LIGHT}
                  placeholderTextColor={TEXT_MID}
                  placeholder="2025"
                />
              </View>
            </View>

            <TouchableOpacity 
              style={styles.dropdownTrigger}
              onPress={() => setMenuVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownContent}>
                {selectedSeller ? (
                  <>
                    <View style={styles.sellerAvatar}>
                      <User size={18} color={GREEN_MAIN} />
                    </View>
                    <View style={styles.sellerInfo}>
                      <Text style={styles.sellerName}>{selectedSeller.name}</Text>
                      <Text style={styles.sellerEmail}>{selectedSeller.email}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <User size={20} color={TEXT_MID} />
                    <Text style={styles.dropdownPlaceholder}>Selecione um vendedor</Text>
                  </>
                )}
                <ChevronDown size={20} color={TEXT_MID} />
              </View>
            </TouchableOpacity>

            <Modal
              visible={menuVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setMenuVisible(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setMenuVisible(false)}
              >
                <Surface style={styles.dropdownModal} elevation={5}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Selecionar Vendedor</Text>
                    <Text style={styles.modalSubtitle}>
                      {sellers.length} vendedor(es) disponível(is)
                    </Text>
                  </View>
                  <ScrollView style={styles.sellerList} nestedScrollEnabled>
                    {sellers.map((seller) => (
                      <TouchableOpacity
                        key={seller.id}
                        style={[
                          styles.sellerItem,
                          selectedSeller?.id === seller.id && styles.sellerItemSelected
                        ]}
                        onPress={() => {
                          setSelectedSeller(seller);
                          setMenuVisible(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.sellerItemAvatar}>
                          <User size={20} color={GREEN_MAIN} />
                        </View>
                        <View style={styles.sellerItemInfo}>
                          <Text style={styles.sellerItemName}>{seller.name}</Text>
                          <Text style={styles.sellerItemEmail}>{seller.email}</Text>
                        </View>
                        {selectedSeller?.id === seller.id && (
                          <View style={styles.checkIcon}>
                            <Check size={18} color={GREEN_MAIN} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                    {sellers.length === 0 && (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Nenhum vendedor encontrado</Text>
                      </View>
                    )}
                  </ScrollView>
                </Surface>
              </TouchableOpacity>
            </Modal>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              mode="contained"
              onPress={handleCreate}
              style={styles.button}
              loading={loading}
              buttonColor={GREEN_MAIN}
              textColor="#fff"
              disabled={loading}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Criar Rota
            </Button>
          </Surface>

          <View style={styles.bottomBar}>
            <View style={[styles.greenBar, { width: '30%' }]} />
            <View style={[styles.greyBar, { width: '20%' }]} />
            <View style={[styles.greenBar, { width: '10%' }]} />
          </View>
        </ScrollView>
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
  card: {
    marginHorizontal: 20,
    marginTop: -24,
    borderRadius: 20,
    padding: 24,
    backgroundColor: CARD_DARK,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: TEXT_MID,
    marginBottom: 20,
  },
  input: {
    marginBottom: 14,
    backgroundColor: INPUT_BG,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: BORDER_GREY,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: INPUT_BG,
    overflow: 'hidden',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  dropdownPlaceholder: {
    flex: 1,
    color: TEXT_MID,
    fontSize: 15,
  },
  sellerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(21, 184, 106, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    color: TEXT_LIGHT,
    fontSize: 15,
    fontWeight: '600',
  },
  sellerEmail: {
    color: TEXT_MID,
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dropdownModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    backgroundColor: CARD_DARK,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_GREY,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
  },
  modalSubtitle: {
    fontSize: 13,
    color: TEXT_MID,
    marginTop: 4,
  },
  sellerList: {
    maxHeight: 300,
    padding: 8,
  },
  sellerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
    gap: 12,
  },
  sellerItemSelected: {
    backgroundColor: 'rgba(21, 184, 106, 0.1)',
  },
  sellerItemAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(21, 184, 106, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerItemInfo: {
    flex: 1,
  },
  sellerItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_LIGHT,
  },
  sellerItemEmail: {
    fontSize: 12,
    color: TEXT_MID,
    marginTop: 2,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(21, 184, 106, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: TEXT_MID,
    fontSize: 14,
  },
  errorText: {
    color: '#e57373',
    fontSize: 13,
    marginBottom: 10,
  },
  button: {
    marginTop: 6,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
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
