import * as React from 'react';
import { StyleSheet, View, Platform, Pressable, ScrollView, TouchableOpacity, RefreshControl, TextInput, Animated } from 'react-native';
import { Text, Surface, Provider as PaperProvider, ActivityIndicator, Modal, Portal } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { 
  ArrowLeft, Route as RouteIcon, User, Phone, MapPin, Calendar, 
  TrendingUp, TrendingDown, CheckCircle, AlertCircle, Clock,
  ChevronDown, ChevronUp, ChevronRight, DollarSign, Plus, X, Search, Trash2,
  CreditCard, Layers, RefreshCw, FileText
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateInadimplentesHtml } from './inadimplentesPdf';

const isWeb = Platform.OS === 'web';

const GREEN_MAIN = '#15B86A';
const BG_DARK = '#0d0d0d';
const CARD_DARK = '#1f1f1f';
const CARD_BG = CARD_DARK;
const INPUT_BG = '#2a2a2a';
const TEXT_LIGHT = '#f0f0f0';
const TEXT_MID = '#a0a0a0';
const BORDER_GREY = '#404040';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface ClientPayment {
  id: string;
  value: number;
  dueDate: string;
  status: string;
  paymentDate?: string;
}

interface Client {
  id: string;
  name: string;
  phone?: string | null;
  mobilePhone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  payments: ClientPayment[];
}

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
  clients: Array<{
    client: Client;
  }>;
}

type FilterStatus = 'all' | 'em_dia' | 'a_vencer' | 'inadimplentes';

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [route, setRoute] = React.useState<RouteData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [filter, setFilter] = React.useState<FilterStatus>('all');
  const [expandedClient, setExpandedClient] = React.useState<string | null>(null);
  const [addModalVisible, setAddModalVisible] = React.useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [availableClients, setAvailableClients] = React.useState<any[]>([]);
  const [uniquePayments, setUniquePayments] = React.useState<any[]>([]);
  const [installmentGroups, setInstallmentGroups] = React.useState<any[]>([]);
  const [singlePayments, setSinglePayments] = React.useState<any[]>([]);
  const [clientsData, setClientsData] = React.useState<any[]>([]);
  const [selectedClient, setSelectedClient] = React.useState<any | null>(null);
  const [loadingClients, setLoadingClients] = React.useState(false);
  const [loadingPayments, setLoadingPayments] = React.useState(false);
  const [refreshProgress, setRefreshProgress] = React.useState(0);
  const [refreshTotal, setRefreshTotal] = React.useState(0);
  const [addingPayment, setAddingPayment] = React.useState(false);
  const [removeClientModalVisible, setRemoveClientModalVisible] = React.useState(false);
  const [clientToRemove, setClientToRemove] = React.useState<{id: string, name: string} | null>(null);
  const [removingClient, setRemovingClient] = React.useState(false);
  const [paymentSelectionMode, setPaymentSelectionMode] = React.useState<'menu' | 'installments' | 'single'>('menu');
  const [modalUniquePayments, setModalUniquePayments] = React.useState<any[]>([]);
  const [modalInstallmentGroups, setModalInstallmentGroups] = React.useState<any[]>([]);
  const [reportModalVisible, setReportModalVisible] = React.useState(false);
  const [generatingReport, setGeneratingReport] = React.useState(false);
  const [fichaMap, setFichaMap] = React.useState<Record<string, string>>({});
  const [pendingFicha, setPendingFicha] = React.useState<{ type: 'installment'; data: any; installmentId: string } | { type: 'payment'; data: any; paymentId: string } | null>(null);
  const [fichaInput, setFichaInput] = React.useState('');
  const [clientSearchQuery, setClientSearchQuery] = React.useState('');
  const spinAnim = React.useRef(new Animated.Value(0)).current;
  const spinLoopRef = React.useRef<any>(null);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  React.useEffect(() => {
    if (loadingPayments) {
      spinLoopRef.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinLoopRef.current.start();
    } else {
      if (spinLoopRef.current) {
        spinLoopRef.current.stop();
      }
      spinAnim.setValue(0);
    }
  }, [loadingPayments]);

  React.useEffect(() => {
    if (id) {
      loadRoute();
      loadAsaasData(true);
    }
  }, [id]);

  React.useEffect(() => {
    if (uniquePayments.length > 0 || installmentGroups.length > 0) {
      const groupedClients: Record<string, any> = {};
      
      uniquePayments.forEach((payment: any) => {
        const customerId = payment.customer;
        if (!groupedClients[customerId]) {
          groupedClients[customerId] = {
            id: customerId,
            name: payment.customerData?.name || 'Cliente',
            phone: payment.customerData?.phone || payment.customerData?.mobilePhone || null,
            fichaNumber: fichaMap[customerId] || '',
            uniquePayments: [],
            installmentGroups: [],
            totalValue: 0,
            received: 0,
            toReceive: 0,
            overdue: 0,
          };
        }
        groupedClients[customerId].uniquePayments.push(payment);
        groupedClients[customerId].totalValue += payment.value || 0;
        if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' || payment.status === 'RECEIVED_IN_CASH') {
          groupedClients[customerId].received += payment.value || 0;
        } else if (payment.status === 'OVERDUE') {
          groupedClients[customerId].overdue += payment.value || 0;
        } else {
          groupedClients[customerId].toReceive += payment.value || 0;
        }
      });

      installmentGroups.forEach((group: any) => {
        const customerId = group.customerId;
        if (!groupedClients[customerId]) {
          groupedClients[customerId] = {
            id: customerId,
            name: group.customerName || 'Cliente',
            phone: group.customerData?.phone || group.customerData?.mobilePhone || null,
            fichaNumber: fichaMap[customerId] || '',
            uniquePayments: [],
            installmentGroups: [],
            totalValue: 0,
            received: 0,
            toReceive: 0,
            overdue: 0,
          };
        }
        groupedClients[customerId].installmentGroups.push(group);
        group.payments?.forEach((payment: any) => {
          groupedClients[customerId].totalValue += payment.value || 0;
          if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' || payment.status === 'RECEIVED_IN_CASH') {
            groupedClients[customerId].received += payment.value || 0;
          } else if (payment.status === 'OVERDUE') {
            groupedClients[customerId].overdue += payment.value || 0;
          } else {
            groupedClients[customerId].toReceive += payment.value || 0;
          }
        });
      });

      setClientsData(Object.values(groupedClients));
    } else {
      setClientsData([]);
    }
  }, [uniquePayments, installmentGroups, fichaMap]);

  const loadRoute = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/routes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.status === 'success') {
        setRoute(data.data);
      }
    } catch (err) {
      console.error('Error loading route:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const CACHE_PREFIX = 'route_data_';

  const saveToCache = async (uniquePmt: any[], installmentGrp: any[], ficha?: Record<string, string>) => {
    const cacheKey = CACHE_PREFIX + id;
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      uniquePayments: uniquePmt,
      installmentGroups: installmentGrp,
      routeClients: ficha || fichaMap
    }));
  };

  const loadAsaasData = async (useCache = true) => {
    const cacheKey = CACHE_PREFIX + id;
    
    if (useCache) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          setUniquePayments(data.uniquePayments || []);
          setInstallmentGroups(data.installmentGroups || []);
          setFichaMap(data.routeClients || {});
          return;
        }
      } catch (err) {
        console.error('Error loading cache:', err);
      }
    }
    
    try {
      setLoadingPayments(true);
      setRefreshProgress(0);
      setRefreshTotal(0);
      
      const token = await AsyncStorage.getItem('token');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
      const headers = { Authorization: `Bearer ${token}` };
      
      const pollInterval = setInterval(async () => {
        try {
          const progRes = await fetch(`${apiUrl}/routes/${id}/refresh-progress`, { headers });
          const progData = await progRes.json();
          if (progData.status === 'success' && progData.data) {
            setRefreshTotal(progData.data.total);
            setRefreshProgress(progData.data.current);
            if (progData.data.current >= progData.data.total && progData.data.total > 0) {
              clearInterval(pollInterval);
            }
          }
        } catch (_) {}
      }, 400);
      
      const response = await fetch(`${apiUrl}/routes/${id}/asaas-data`, { headers });
      clearInterval(pollInterval);
      
      const data = await response.json();
      if (data.status === 'success') {
        setRefreshProgress(data.data.uniquePayments?.length || 0 + data.data.installmentGroups?.length || 0);
        setRefreshTotal(data.data.uniquePayments?.length || 0 + data.data.installmentGroups?.length || 0);
        setUniquePayments(data.data.uniquePayments || []);
        setInstallmentGroups(data.data.installmentGroups || []);
        setFichaMap(data.data.routeClients || {});
        
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data.data));
      }
    } catch (err) {
      console.error('Error loading Asaas data:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRoute();
    loadAsaasData(false);
  };

  const searchClients = async (query: string) => {
    setSearchQuery(query);
    setSelectedClient(null);
    setModalUniquePayments([]);
    setModalInstallmentGroups([]);
    
    if (query.length < 2) {
      setAvailableClients([]);
      return;
    }

    setLoadingClients(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(
        `${apiUrl}/clients/available?routeId=${route?.id}&search=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.status === 'success') {
        setAvailableClients(data.data);
      }
    } catch (err) {
      console.error('Error searching clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const selectClient = async (client: any) => {
    setSelectedClient(client);
    setPaymentSelectionMode('menu');
    setLoadingPayments(true);
    
    try {
      const token = await AsyncStorage.getItem('token');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(
        `${apiUrl}/clients/${client.id}/payments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.status === 'success') {
        setModalUniquePayments(data.data.uniquePayments || []);
        setModalInstallmentGroups(data.data.installments || []);
        setSinglePayments(data.data.singlePayments || []);
      }
    } catch (err) {
      console.error('Error loading payments:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  const addPaymentToRoute = async (paymentAsaasId: string, ficha?: string) => {
    if (!route) return;
    setAddingPayment(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/routes/add-payment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ routeId: route.id, paymentAsaasId, fichaNumber: ficha || null }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setAddModalVisible(false);
        setSearchQuery('');
        setAvailableClients([]);
        setSelectedClient(null);
        setModalUniquePayments([]);
        setSinglePayments([]);
        setPaymentSelectionMode('menu');
        
        const updatedFicha = result.data?.fichaNumber
          ? { ...fichaMap, [result.data.payment?.customer || '']: result.data.fichaNumber }
          : fichaMap;
        setFichaMap(updatedFicha);
        
        if (result.data?.payment) {
          const updatedPayments = [...uniquePayments, result.data.payment];
          setUniquePayments(updatedPayments);
          saveToCache(updatedPayments, installmentGroups, updatedFicha);
        }
      } else {
        alert(result.message || 'Erro ao adicionar pagamento');
      }
    } catch (err) {
      console.error('Error adding payment:', err);
      alert('Erro ao adicionar pagamento');
    } finally {
      setAddingPayment(false);
    }
  };

const addInstallmentToRoute = async (installmentAsaasId: string, ficha?: string) => {
    if (!route) return;
    setAddingPayment(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/routes/add-installment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ routeId: route.id, installmentAsaasId, fichaNumber: ficha || null }),
      });

      const result = await response.json();

      if (response.ok) {
        setAddModalVisible(false);
        setSearchQuery('');
        setAvailableClients([]);
        setSelectedClient(null);
        setModalUniquePayments([]);
        setSinglePayments([]);
        setPaymentSelectionMode('menu');
        
        const updatedFicha = result.data?.fichaNumber
          ? { ...fichaMap, [result.data.installmentGroup?.customerId || '']: result.data.fichaNumber }
          : fichaMap;
        setFichaMap(updatedFicha);
        
        if (result.data?.installmentGroup) {
          const updatedGroups = [...installmentGroups, result.data.installmentGroup];
          setInstallmentGroups(updatedGroups);
          saveToCache(uniquePayments, updatedGroups, updatedFicha);
        }
      } else {
        alert(result.message || 'Erro ao adicionar parcelamento');
      }
    } catch (err) {
      console.error('Error adding installment:', err);
      alert('Erro ao adicionar parcelamento');
    } finally {
      setAddingPayment(false);
    }
  };
        const openAddModal = () => {
    setAddModalVisible(true);
    setSearchQuery('');
    setAvailableClients([]);
    setSelectedClient(null);
    setModalUniquePayments([]);
    setModalInstallmentGroups([]);
    setSinglePayments([]);
    setPaymentSelectionMode('menu');
  };

  const openRemoveClientModal = (clientId: string, clientName: string) => {
    setClientToRemove({ id: clientId, name: clientName });
    setRemoveClientModalVisible(true);
  };

  const removeClientFromRoute = async () => {
    if (!route || !clientToRemove) return;
    setRemovingClient(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
      
      const paymentIdsToRemove: string[] = [];
      const clientData = clientsData.find(c => c.id === clientToRemove.id);
      if (clientData) {
        clientData.uniquePayments?.forEach((p: any) => paymentIdsToRemove.push(p.id));
        clientData.installmentGroups?.forEach((g: any) => {
          g.payments?.forEach((p: any) => paymentIdsToRemove.push(p.id));
        });
      }

      for (const paymentId of paymentIdsToRemove) {
        await fetch(`${apiUrl}/routes/${route.id}/payments/${paymentId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const updatedUniquePayments = uniquePayments.filter((p: any) => !paymentIdsToRemove.includes(p.id));
      setUniquePayments(updatedUniquePayments);

      const updatedInstallmentGroups = installmentGroups.map((g: any) => ({
        ...g,
        payments: g.payments?.filter((p: any) => !paymentIdsToRemove.includes(p.id))
      })).filter((g: any) => g.payments?.length > 0);
      setInstallmentGroups(updatedInstallmentGroups);

      const newClientsData = clientsData.filter(c => c.id !== clientToRemove.id);
      setClientsData(newClientsData);

      const cacheKey = CACHE_PREFIX + route.id;
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        uniquePayments: updatedUniquePayments,
        installmentGroups: updatedInstallmentGroups
      }));

      setRemoveClientModalVisible(false);
      setClientToRemove(null);
      setExpandedClient(null);
    } catch (err) {
      console.error('Error removing client:', err);
      alert('Erro ao remover cliente');
    } finally {
      setRemovingClient(false);
    }
  };

const generateInadimplentesReport = async () => {
    setGeneratingReport(true);
    
    try {
      const inadimplentClients = clientsData.filter((client: any) => {
        const stats = getClientStats(client);
        return stats.overdue > 0;
      });

      if (inadimplentClients.length === 0) {
        alert('Nao ha clientes inadimplentes nesta rota.');
        setGeneratingReport(false);
        return;
      }

      const totalOverdue = inadimplentClients.reduce((sum: number, client: any) => {
        return sum + getClientStats(client).overdue;
      }, 0);

      const inadimplenceRate = summary.defaultRate;

      const monthNames = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const reportDate = new Date().toLocaleDateString('pt-BR');
      const routeName = route?.name || 'Rota';
      const routeMonth = route ? `${monthNames[route.month - 1]} / ${route.year}` : '';

      const html = generateInadimplentesHtml(
        inadimplentClients,
        totalOverdue,
        inadimplenceRate,
        routeName,
        routeMonth,
        reportDate,
        getClientStats
      );

      if (isWeb) {
        const mesAtual = new Date().getMonth() + 1;
        const anoAtual = new Date().getFullYear();
        const titulo = `inadimplentes_${route?.name || 'rota'}_${mesAtual}_${anoAtual}`;
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.title = titulo;
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } else {
        const mesAtual = new Date().getMonth() + 1;
      const anoAtual = new Date().getFullYear();
      const nomeArquivo = `inadimplentes_${route?.name || 'rota'}_${mesAtual}_${anoAtual}`;
      
      const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Compartilhar Relatório de Inadimplentes',
            UTI: 'com.adobe.pdf'
          });
        } else {
          alert('PDF gerado em: ' + uri);
        }
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Erro ao gerar relatório');
    } finally {
      setGeneratingReport(false);
    }
  };

  const getClientStatus = (client: any) => {
    if (!client) return 'a_vencer';
    const stats = getClientStats(client);
    if (stats.overdue > 0 && stats.toReceive === 0 && stats.received === 0) return 'inadimplentes';
    if (stats.overdue > 0) return 'inadimplentes';
    if (stats.toReceive > 0) return 'a_vencer';
    return 'em_dia';
  };

  const getClientStats = (client: any) => {
    let received = 0, toReceive = 0, overdue = 0;

    client.uniquePayments?.forEach((payment: any) => {
      if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' || payment.status === 'RECEIVED_IN_CASH') {
        received += payment.value || 0;
      } else if (payment.status === 'OVERDUE') {
        overdue += payment.value || 0;
      } else {
        toReceive += payment.value || 0;
      }
    });

    client.installmentGroups?.forEach((group: any) => {
      group.payments?.forEach((payment: any) => {
        if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' || payment.status === 'RECEIVED_IN_CASH') {
          received += payment.value || 0;
        } else if (payment.status === 'OVERDUE') {
          overdue += payment.value || 0;
        } else {
          toReceive += payment.value || 0;
        }
      });
    });

    return { received, toReceive, overdue };
  };

  const handleDelete = async () => {
    if (!route) return;
    setDeleting(true);
    
    try {
      const token = await AsyncStorage.getItem('token');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/routes/${route.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        setDeleteModalVisible(false);
        router.back();
      } else {
        alert('Erro ao excluir rota');
      }
    } catch (err) {
      console.error('Error deleting route:', err);
      alert('Erro ao excluir rota');
    } finally {
      setDeleting(false);
    }
  };

  const filteredClients = React.useMemo(() => {
    if (!clientsData || clientsData.length === 0) return [];
    return clientsData.filter(client => {
      if (filter !== 'all' && getClientStatus(client) !== filter) return false;
      if (clientSearchQuery.trim()) {
        const q = clientSearchQuery.trim().toLowerCase();
        const name = (client.name || '').toLowerCase();
        const ficha = (client.fichaNumber || '').toLowerCase();
        if (!name.includes(q) && !ficha.includes(q)) return false;
      }
      return true;
    });
  }, [clientsData, filter, clientSearchQuery]);

  const summary = React.useMemo(() => {
    if (!clientsData || clientsData.length === 0) { 
      return { emDia: 0, aVencer: 0, inadimplentes: 0, received: 0, toReceive: 0, overdue: 0, total: 0, defaultRate: 0 };
    }
    
    let emDia = 0, aVencer = 0, inadimplentes = 0;
    let received = 0, toReceive = 0, overdue = 0, total = 0;
    
    clientsData.forEach(client => {
      const status = getClientStatus(client);
      const stats = getClientStats(client);
      
      if (status === 'em_dia') emDia++;
      else if (status === 'a_vencer') aVencer++;
      else inadimplentes++;
      
      received += stats.received;
      toReceive += stats.toReceive;
      overdue += stats.overdue;
      total += stats.received + stats.toReceive + stats.overdue;
    });
    
    const defaultRate = total > 0 ? (overdue / total) * 100 : 0;
    
    return { emDia, aVencer, inadimplentes, received, toReceive, overdue, total, defaultRate };
  }, [clientsData]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: FilterStatus) => {
    switch (status) {
      case 'em_dia': return '#4CAF50';
      case 'a_vencer': return '#FF9800';
      case 'inadimplentes': return '#f44336';
      default: return TEXT_MID;
    }
  };

  const getStatusLabel = (status: FilterStatus) => {
    switch (status) {
      case 'em_dia': return 'Em Dia';
      case 'a_vencer': return 'A Vencer';
      case 'inadimplentes': return 'Inadimplentes';
      default: return 'Todos';
    }
  };

  if (loading) {
    return (
      <PaperProvider>
        <View style={styles.root}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GREEN_MAIN} />
            <Text style={styles.loadingText}>Carregando rota...</Text>
          </View>
        </View>
      </PaperProvider>
    );
  }

  if (!route) {
    return (
      <PaperProvider>
        <View style={styles.root}>
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>Rota não encontrada</Text>
          </View>
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#fff" />
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={() => setDeleteModalVisible(true)}>
            <Trash2 size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <View style={styles.logoCircle}>
            <RouteIcon size={36} color={GREEN_MAIN} />
          </View>
          <Text style={styles.appName}>{route.name}</Text>
          <Text style={styles.headerSubtitle}>
            {MONTH_NAMES[route.month - 1]} / {route.year}
          </Text>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN_MAIN} />
          }
        >
          <Surface style={styles.summaryCard} elevation={2}>
            <Text style={styles.summaryTitle}>Resumo Financeiro</Text>
            
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { borderColor: '#4CAF50' }]}>
                <Text style={[styles.statusCount, { color: '#4CAF50' }]}>{summary.emDia}</Text>
                <Text style={[styles.statusLabel, { color: '#4CAF50' }]}>Em Dia</Text>
              </View>
              <View style={[styles.statusBadge, { borderColor: '#FF9800' }]}>
                <Text style={[styles.statusCount, { color: '#FF9800' }]}>{summary.aVencer}</Text>
                <Text style={[styles.statusLabel, { color: '#FF9800' }]}>A Vencer</Text>
              </View>
              <View style={[styles.statusBadge, { borderColor: '#f44336' }]}>
                <Text style={[styles.statusCount, { color: '#f44336' }]}>{summary.inadimplentes}</Text>
                <Text style={[styles.statusLabel, { color: '#f44336' }]}>Inadimpl.</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.financeRow}>
              <View style={styles.financeItem}>
                <TrendingUp size={18} color="#4CAF50" />
                <Text style={styles.financeLabel}>Recebido</Text>
                <Text style={[styles.financeValue, { color: '#4CAF50' }]}>
                  {summary.received > 0 ? formatCurrency(summary.received) : '—'}
                </Text>
              </View>
              <View style={styles.financeItem}>
                <Clock size={18} color="#FF9800" />
                <Text style={styles.financeLabel}>A Vencer</Text>
                <Text style={[styles.financeValue, { color: '#FF9800' }]}>
                  {summary.toReceive > 0 ? formatCurrency(summary.toReceive) : '—'}
                </Text>
              </View>
              <View style={styles.financeItem}>
                <TrendingDown size={18} color="#f44336" />
                <Text style={styles.financeLabel}>Vencido</Text>
                <Text style={[styles.financeValue, { color: '#f44336' }]}>
                  {summary.overdue > 0 ? formatCurrency(summary.overdue) : '—'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <View style={styles.totalItem}>
                <DollarSign size={22} color={GREEN_MAIN} />
                <Text style={styles.totalLabel}>Total Geral</Text>
                <Text style={styles.totalValue}>
                  {summary.total > 0 ? formatCurrency(summary.total) : '—'}
                </Text>
              </View>
              <View style={styles.totalItem}>
                <AlertCircle size={22} color="#f44336" />
                <Text style={styles.totalLabel}>Taxa Inadimpl.</Text>
                <Text style={[styles.totalValue, { color: '#f44336' }]}>
                  {summary.total > 0 ? `${summary.defaultRate.toFixed(1)}%` : '—'}
                </Text>
              </View>
            </View>
</Surface>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => loadAsaasData(false)} disabled={loadingPayments}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <RefreshCw size={14} color={GREEN_MAIN} />
              </Animated.View>
              <Text style={styles.actionBtnText}>{loadingPayments ? 'Atualizando...' : 'Atualizar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setReportModalVisible(true)}>
              <FileText size={14} color={GREEN_MAIN} />
              <Text style={styles.actionBtnText}>Relatório</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
              <Plus size={14} color="#fff" />
              <Text style={styles.addBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {loadingPayments && refreshTotal > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min((refreshProgress / refreshTotal) * 100, 100)}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {refreshProgress} de {refreshTotal} pagamentos
              </Text>
            </View>
          )}

          <View style={styles.clientSearchBar}>
            <Search size={16} color={TEXT_MID} />
            <TextInput
              style={styles.clientSearchInput}
              placeholder="Filtrar por nome ou ficha..."
              placeholderTextColor={TEXT_MID}
              value={clientSearchQuery}
              onChangeText={setClientSearchQuery}
            />
            {clientSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setClientSearchQuery('')}>
                <X size={16} color={TEXT_MID} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.clientsCountLabel}>Clientes ({filteredClients.length})</Text>

          <View style={styles.filtersWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {(['all', 'em_dia', 'a_vencer', 'inadimplentes'] as FilterStatus[]).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterButton,
                    filter === status && { backgroundColor: getStatusColor(status) }
                  ]}
                  onPress={() => setFilter(status)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    filter === status && { color: '#fff' }
                  ]}>
                    {getStatusLabel(status)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {filteredClients.length === 0 ? (
            <Surface style={styles.emptyCard} elevation={2}>
              <Text style={styles.emptyText}>Nenhum cliente encontrado</Text>
            </Surface>
          ) : (
            filteredClients.map((client) => {
              const isExpanded = expandedClient === client.id;
              const status = getClientStatus(client);
              const stats = getClientStats(client);
              
              return (
                <TouchableOpacity
                  key={client.id}
                  activeOpacity={0.9}
                  onPress={() => setExpandedClient(isExpanded ? null : client.id)}
                >
                  <Surface style={styles.clientCard} elevation={2}>
                    <View style={styles.clientHeader}>
                      <View style={[
                        styles.clientAvatar,
                        { backgroundColor: `${getStatusColor(status)}20` }
                      ]}>
                        <User size={22} color={getStatusColor(status)} />
                      </View>
                      <View style={styles.clientInfo}>
                        <Text style={styles.clientName}>{client.fichaNumber ? `${client.name} - ${client.fichaNumber}` : client.name}</Text>
                        <View style={styles.clientMeta}>
                          <View style={[styles.clientStatusBadge, { borderColor: getStatusColor(status) }]}>
                            <Text style={[styles.clientStatusText, { color: getStatusColor(status) }]}>{getStatusLabel(status)}</Text>
                          </View>
                          <Text style={styles.clientTotal}>
                            Total: {formatCurrency(stats.received + stats.toReceive + stats.overdue)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.expandIcon}>
                        {isExpanded ? (
                          <ChevronUp size={22} color={TEXT_MID} />
                        ) : (
                          <ChevronDown size={22} color={TEXT_MID} />
                        )}
                      </View>
                    </View>

                    {isExpanded && (
                      <View style={styles.clientDetails}>
                        <View style={styles.detailDivider} />
                        
                        {(client.phone) && (
                          <View style={styles.detailRow}>
                            <Phone size={16} color={TEXT_MID} />
                            <Text style={styles.detailText}>{client.phone}</Text>
                          </View>
                        )}
                        
{client.uniquePayments && client.uniquePayments.length > 0 && (
                          <View style={styles.paymentsSection}>
                            <Text style={styles.paymentsTitle}>Parcelas Únicas</Text>
                            {client.uniquePayments.map((payment: any) => (
                              <View key={payment.id} style={styles.paymentRow}>
                                <View style={styles.paymentRowInner}>
                                  <Calendar size={14} color={TEXT_MID} />
                                  <Text style={styles.paymentDateRow}>{formatDate(payment.dueDate)}</Text>
                                </View>
                                <Text style={styles.paymentAmount}>{formatCurrency(payment.value)}</Text>
                                <View style={[
                                  styles.paymentStatusBadge,
                                  { 
                                    backgroundColor: payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' || payment.status === 'RECEIVED_IN_CASH' ? '#1b5e20' : 
                                                     payment.status === 'OVERDUE' ? '#b71c1c' : '#e65100'
                                  }
                                ]}>
                                  <Text style={styles.paymentStatusText}>
                                    {payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' || payment.status === 'RECEIVED_IN_CASH' ? 'Pago' : 
                                     payment.status === 'OVERDUE' ? 'Vencido' : 'Pendente'}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}

                        {client.installmentGroups && client.installmentGroups.map((group: any, idx: number) => (
                          <View key={idx} style={styles.paymentsSection}>
                            <Text style={styles.paymentsTitle}>{group.installmentCount}x {formatCurrency(group.valuePerInstallment || group.totalValue / group.installmentCount)} = {formatCurrency(group.payments?.reduce((sum: number, p: any) => sum + (p.value || 0), 0) || group.totalValue || 0)}</Text>
                            {group.payments?.map((payment: any) => (
                              <View key={payment.id} style={styles.paymentRow}>
                                <View style={styles.paymentRowInner}>
                                  <Calendar size={14} color={TEXT_MID} />
                                  <Text style={styles.paymentDateRow}>{formatDate(payment.dueDate)}</Text>
                                </View>
                                <Text style={styles.paymentAmount}>{formatCurrency(payment.value)}</Text>
                                <View style={[
                                  styles.paymentStatusBadge,
                                  { 
                                    backgroundColor: payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' || payment.status === 'RECEIVED_IN_CASH' ? '#1b5e20' : 
                                                     payment.status === 'OVERDUE' ? '#b71c1c' : '#e65100'
                                  }
                                ]}>
                                  <Text style={styles.paymentStatusText}>
                                    {payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' || payment.status === 'RECEIVED_IN_CASH' ? 'Pago' : 
                                     payment.status === 'OVERDUE' ? 'Vencido' : 'Pendente'}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        ))}

                        <TouchableOpacity
                          style={styles.removeClientButton}
                          onPress={() => openRemoveClientModal(client.id, client.name)}
                        >
                          <Trash2 size={16} color="#f44336" />
                          <Text style={styles.removeClientButtonText}>Remover da rota</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </Surface>
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 30 }} />
        </ScrollView>

        <Modal
          visible={addModalVisible}
          onDismiss={() => setAddModalVisible(false)}
        >
          <View style={styles.modalWrapper}>
            <TouchableOpacity 
              style={styles.modalBackground}
              activeOpacity={1}
              onPress={() => setAddModalVisible(false)}
            />
            <View style={styles.clientSearchModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Adicionar Cliente</Text>
                <Pressable onPress={() => setAddModalVisible(false)}>
                  <X size={24} color={TEXT_LIGHT} />
                </Pressable>
              </View>

              <View style={styles.searchContainer}>
                <Search size={18} color={TEXT_MID} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Pesquisar por nome..."
                  placeholderTextColor={TEXT_MID}
                  value={searchQuery}
                  onChangeText={searchClients}
                  autoFocus
                />
              </View>

<ScrollView style={styles.clientList} contentContainerStyle={{ flexGrow: 1 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {loadingClients ? (
                  <ActivityIndicator size="small" color={GREEN_MAIN} style={{ marginVertical: 20 }} />
                ) : !selectedClient ? (
                  availableClients.length === 0 ? (
                    <View style={styles.emptySearch}>
                      <Text style={styles.emptySearchText}>
                        {searchQuery.length < 2 
                          ? 'Digite pelo menos 2 caracteres para buscar'
                          : 'Nenhum cliente encontrado'}
                      </Text>
                    </View>
                  ) : (
                    availableClients.map((client) => (
                      <TouchableOpacity
                        key={client.id}
                        style={styles.clientSearchItem}
                        onPress={() => selectClient(client)}
                      >
                        <View style={styles.clientSearchAvatar}>
                          <User size={20} color={GREEN_MAIN} />
                        </View>
                        <View style={styles.clientSearchInfo}>
                          <Text style={styles.clientSearchName}>{client.name}</Text>
                          <Text style={styles.clientSearchMeta}>
                            {client.phone || client.mobilePhone || 'Sem telefone'}
                          </Text>
                        </View>
                        <ChevronRight size={20} color={TEXT_MID} />
                      </TouchableOpacity>
                    ))
                  )
                ) : (
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity
                      style={styles.modalBackButton}
                      onPress={() => {
                        if (paymentSelectionMode === 'menu') {
                          setSelectedClient(null);
                          setModalUniquePayments([]);
                          setModalInstallmentGroups([]);
                          setSinglePayments([]);
                        } else {
                          setPaymentSelectionMode('menu');
                        }
                      }}
                    >
                      <ArrowLeft size={18} color={GREEN_MAIN} />
                      <Text style={styles.backButtonText}>
                        {paymentSelectionMode === 'menu' ? 'Voltar para lista de clientes' : 'Voltar ao menu'}
                      </Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.clientPaymentsTitle}>
                      {selectedClient?.name}
                    </Text>

                    {loadingPayments ? (
                      <ActivityIndicator size="small" color={GREEN_MAIN} style={{ marginVertical: 20 }} />
                    ) : paymentSelectionMode === 'menu' ? (
                      <View style={styles.paymentMenu}>
                        <Text style={styles.paymentMenuSubtitle}>Como deseja adicionar?</Text>
                        
                        <TouchableOpacity
                          style={styles.paymentMenuItem}
                          onPress={() => setPaymentSelectionMode('installments')}
                          disabled={modalInstallmentGroups.length === 0}
                        >
                          <View style={[styles.paymentMenuIcon, { backgroundColor: GREEN_MAIN + '30' }]}>
                            <Layers size={24} color={GREEN_MAIN} />
                          </View>
                          <View style={styles.paymentMenuInfo}>
                            <Text style={styles.paymentMenuTitle}>Selecionar Parcelamento</Text>
                            <Text style={styles.paymentMenuDesc}>
                              {modalInstallmentGroups.length} parcelamento(s) disponível(s)
                            </Text>
                          </View>
                          <ChevronRight size={20} color={TEXT_MID} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.paymentMenuItem}
                          onPress={() => setPaymentSelectionMode('single')}
                          disabled={singlePayments.length === 0}
                        >
                          <View style={[styles.paymentMenuIcon, { backgroundColor: GREEN_MAIN + '30' }]}>
                            <CreditCard size={24} color={GREEN_MAIN} />
                          </View>
                          <View style={styles.paymentMenuInfo}>
                            <Text style={styles.paymentMenuTitle}>Escolher Parcela</Text>
                            <Text style={styles.paymentMenuDesc}>
                              {singlePayments.length} parcela(s) disponível(s)
                            </Text>
                          </View>
                          <ChevronRight size={20} color={TEXT_MID} />
                        </TouchableOpacity>
                      </View>
                    ) : paymentSelectionMode === 'installments' ? (
                      pendingFicha && pendingFicha.type === 'installment' ? (
                        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}>
                          <Text style={styles.categoryTitle}>Confirmar Parcelamento</Text>
                          <View style={styles.installmentItem}>
                            <View style={styles.installmentInfo}>
                              <Text style={styles.installmentTitle}>
                                Parcelamento {(pendingFicha.data as any).installmentCount}x
                              </Text>
                              <Text style={styles.installmentSubtitle}>
                                Total: {formatCurrency((pendingFicha.data as any).totalValue)}
                              </Text>
                            </View>
                          </View>
                          <View style={{ marginVertical: 16 }}>
                            <Text style={{ fontSize: 13, color: TEXT_MID, marginBottom: 8 }}>Numero da Ficha</Text>
                            <TextInput
                              style={[styles.searchInput, { backgroundColor: INPUT_BG, borderRadius: 8, paddingHorizontal: 12, height: 44 }]}
                              placeholder="Ex: Joao 3, Maria 2, etc"
                              placeholderTextColor={TEXT_MID}
                              value={fichaInput}
                              onChangeText={setFichaInput}
                              autoFocus
                            />
                          </View>
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                              style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: BORDER_GREY }}
                              onPress={() => { setPendingFicha(null); setFichaInput(''); }}
                            >
                              <Text style={{ color: TEXT_LIGHT, fontSize: 14, fontWeight: '600' }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: GREEN_MAIN }}
                              onPress={() => {
                                addInstallmentToRoute((pendingFicha.data as any).installmentId, fichaInput);
                                setPendingFicha(null);
                                setFichaInput('');
                              }}
                              disabled={addingPayment}
                            >
                              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                                {addingPayment ? 'Adicionando...' : 'Adicionar'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                      <ScrollView style={{ flex: 1 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        <Text style={styles.categoryTitle}>Selecionar Parcelamento</Text>
                        
                        {modalInstallmentGroups.length === 0 ? (
                          <View style={styles.emptySearch}>
                            <Text style={styles.emptySearchText}>Nenhum parcelamento encontrado</Text>
                          </View>
                        ) : (
                          modalInstallmentGroups.map((installment: any) => (
                            <TouchableOpacity
                              key={installment.installmentId}
                              style={styles.installmentItem}
                              onPress={() => {
                                setPendingFicha({ type: 'installment', data: installment, installmentId: installment.installmentId });
                                setFichaInput(fichaMap[selectedClient?.id || ''] || '');
                              }}
                              disabled={addingPayment}
                            >
                              <View style={styles.installmentInfo}>
                                <Text style={styles.installmentTitle}>
                                  Parcelamento {installment.installmentCount}x
                                </Text>
                                <Text style={styles.installmentSubtitle}>
                                  Total: {formatCurrency(installment.totalValue)}
                                </Text>
                              </View>
                              <View style={styles.installmentRight}>
                                <View style={styles.installmentBadges}>
                                  {installment.payments.slice(0, 3).map((p: any, idx: number) => (
                                    <View key={idx} style={[
                                      styles.installmentMiniBadge,
                                      { backgroundColor: p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH' ? '#1b5e20' : 
                                                       p.status === 'OVERDUE' ? '#b71c1c' : '#e65100' }
                                    ]}>
                                      <Text style={styles.installmentMiniBadgeText}>
                                        {p.installmentNumber}º
                                      </Text>
                                    </View>
                                  ))}
                                  {installment.payments.length > 3 && (
                                    <Text style={styles.installmentMore}>
                                      +{installment.payments.length - 3}
                                    </Text>
                                  )}
                                </View>
                                <Plus size={18} color={GREEN_MAIN} />
                              </View>
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    )
                  ) : (
                      pendingFicha && pendingFicha.type === 'payment' ? (
                        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}>
                          <Text style={styles.categoryTitle}>Confirmar Pagamento</Text>
                          <View style={styles.installmentItem}>
                            <View style={styles.installmentInfo}>
                              <Text style={styles.installmentTitle}>
                                {(pendingFicha.data as any).description || 'Pagamento'}
                              </Text>
                              <Text style={styles.installmentSubtitle}>
                                Valor: {formatCurrency((pendingFicha.data as any).value)}
                              </Text>
                            </View>
                          </View>
                          <View style={{ marginVertical: 16 }}>
                            <Text style={{ fontSize: 13, color: TEXT_MID, marginBottom: 8 }}>Numero da Ficha</Text>
                            <TextInput
                              style={[styles.searchInput, { backgroundColor: INPUT_BG, borderRadius: 8, paddingHorizontal: 12, height: 44 }]}
                              placeholder="Ex: Joao 3, Maria 2, etc"
                              placeholderTextColor={TEXT_MID}
                              value={fichaInput}
                              onChangeText={setFichaInput}
                              autoFocus
                            />
                          </View>
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                              style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: BORDER_GREY }}
                              onPress={() => { setPendingFicha(null); setFichaInput(''); }}
                            >
                              <Text style={{ color: TEXT_LIGHT, fontSize: 14, fontWeight: '600' }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: GREEN_MAIN }}
                              onPress={() => {
                                addPaymentToRoute((pendingFicha.data as any).id, fichaInput);
                                setPendingFicha(null);
                                setFichaInput('');
                              }}
                              disabled={addingPayment}
                            >
                              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                                {addingPayment ? 'Adicionando...' : 'Adicionar'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                      <ScrollView style={{ flex: 1 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        <Text style={styles.categoryTitle}>Escolher Parcela</Text>
                        
                        {singlePayments.length === 0 ? (
                          <View style={styles.emptySearch}>
                            <Text style={styles.emptySearchText}>Nenhuma parcela encontrada</Text>
                          </View>
                        ) : (
                          singlePayments.map((payment: any) => (
                            <TouchableOpacity
                              key={payment.id}
                              style={styles.paymentItem}
                              onPress={() => {
                                setPendingFicha({ type: 'payment', data: payment, paymentId: payment.id });
                                setFichaInput(fichaMap[selectedClient?.id || ''] || '');
                              }}
                              disabled={addingPayment}
                            >
                              <View style={styles.paymentItemRow}>
                                <View style={styles.paymentHeaderRow}>
                                  <Text style={styles.paymentDescription}>
                                    {payment.description || (payment.isPartOfInstallment ? `Parcela ${payment.installmentNumber}º` : 'Pagamento à vista')}
                                  </Text>
                                  {payment.isPartOfInstallment && payment.installmentInfo && (
                                    <View style={styles.installmentTag}>
                                      <Text style={styles.installmentTagText}>{payment.installmentInfo}</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.paymentDateSmall}>
                                  Vencimento: {formatDate(payment.dueDate)}
                                </Text>
                              </View>
                              <View style={styles.paymentRight}>
                                <Text style={styles.paymentValue}>
                                  {formatCurrency(payment.value)}
                                </Text>
                                <View style={[
                                  styles.paymentStatusBadge,
                                  { backgroundColor: payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' || payment.status === 'RECEIVED_IN_CASH' ? '#1b5e20' : 
                                                   payment.status === 'OVERDUE' ? '#b71c1c' : '#e65100' }
                                ]}>
                                  <Text style={styles.paymentStatusText}>
                                    {payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' || payment.status === 'RECEIVED_IN_CASH' ? 'Pago' : 
                                     payment.status === 'OVERDUE' ? 'Vencido' : 'Pendente'}
                                  </Text>
                                </View>
                              </View>
                              <Plus size={18} color={GREEN_MAIN} />
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    )
                  )}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={deleteModalVisible}
          onDismiss={() => setDeleteModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setDeleteModalVisible(false)}
          >
            <Surface style={styles.deleteModal} elevation={5}>
              <View style={styles.deleteIconContainer}>
                <Trash2 size={40} color="#f44336" />
              </View>
              <Text style={styles.deleteTitle}>Excluir Rota</Text>
              <Text style={styles.deleteMessage}>
                Tem certeza que deseja excluir "{route?.name}"? Esta ação não pode ser desfeita.
              </Text>
              <View style={styles.deleteButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.confirmDeleteButton}
                  onPress={handleDelete}
                  disabled={deleting}
                >
                  <Text style={styles.confirmDeleteText}>
                    {deleting ? 'Excluindo...' : 'Excluir'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Surface>
          </TouchableOpacity>
        </Modal>

        <Modal
          visible={removeClientModalVisible}
          onDismiss={() => setRemoveClientModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setRemoveClientModalVisible(false)}
          >
            <Surface style={styles.deleteModal} elevation={5}>
              <View style={styles.deleteIconContainer}>
                <Trash2 size={40} color="#f44336" />
              </View>
              <Text style={styles.deleteTitle}>Remover Cliente</Text>
              <Text style={styles.deleteMessage}>
                Remover "{clientToRemove?.name}" desta rota?
              </Text>
              <Text style={styles.deleteSubmessage}>
                Isso removerá todos os pagamentos deste cliente da rota.
              </Text>
              <View style={styles.deleteButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setRemoveClientModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.confirmDeleteButton}
                  onPress={removeClientFromRoute}
                  disabled={removingClient}
                >
                  <Text style={styles.confirmDeleteText}>
                    {removingClient ? 'Removendo...' : 'Remover'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Surface>
          </TouchableOpacity>
        </Modal>

        <View style={styles.bottomBar}>
          <View style={[styles.greenBar, { width: '30%' }]} />
          <View style={[styles.greyBar, { width: '20%' }]} />
          <View style={[styles.greenBar, { width: '10%' }]} />
        </View>

        <Modal
          visible={reportModalVisible}
          onDismiss={() => setReportModalVisible(false)}
        >
          <View style={styles.modalWrapper}>
            <TouchableOpacity 
              style={styles.modalBackground}
              activeOpacity={1}
              onPress={() => setReportModalVisible(false)}
            />
            <View style={styles.reportModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Criar Relatório</Text>
                <Pressable onPress={() => setReportModalVisible(false)}>
                  <X size={24} color={TEXT_LIGHT} />
                </Pressable>
              </View>

              <TouchableOpacity 
                style={styles.reportOption}
                onPress={() => {
                  setReportModalVisible(false);
                }}
              >
                <FileText size={24} color={GREEN_MAIN} />
                <View style={styles.reportOptionText}>
                  <Text style={styles.reportOptionTitle}>Relatório Completo</Text>
                  <Text style={styles.reportOptionDesc}>Todos os clientes e pagamentos</Text>
                </View>
                <ChevronRight size={20} color={TEXT_MID} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.reportOption}
                onPress={() => {
                  setReportModalVisible(false);
                  generateInadimplentesReport();
                }}
              >
                <AlertCircle size={24} color="#f44336" />
                <View style={styles.reportOptionText}>
                  <Text style={styles.reportOptionTitle}>Relatório de Inadimplentes</Text>
                  <Text style={styles.reportOptionDesc}>Clientes com pagamentos vencidos</Text>
                </View>
                <ChevronRight size={20} color={TEXT_MID} />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: TEXT_MID,
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#f44336',
    fontSize: 16,
  },
  header: {
    backgroundColor: GREEN_MAIN,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 30,
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
  deleteButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 65 : 45,
    right: 20,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
content: {
    flex: 1,
    padding: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: BORDER_GREY,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: GREEN_MAIN,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: TEXT_MID,
    minWidth: 100,
    textAlign: 'right',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD_BG,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: {
    color: GREEN_MAIN,
    fontSize: 13,
    fontWeight: '500',
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN_MAIN,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  clientsCountLabel: {
    color: GREEN_MAIN,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  clientSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    marginBottom: 10,
  },
  clientSearchInput: {
    flex: 1,
    fontSize: 13,
    color: TEXT_LIGHT,
    height: 40,
  },
  filtersWrapper: {
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: GREEN_MAIN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  updateButtonRow: {
    backgroundColor: CARD_BG,
    paddingVertical: 14,
    borderRadius: 12,
  },
  updateButtonText: {
    color: GREEN_MAIN,
    fontSize: 16,
    fontWeight: '500',
  },
  summaryCard: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: CARD_DARK,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 4,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  statusCount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statusLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER_GREY,
    marginVertical: 16,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financeItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  financeLabel: {
    fontSize: 12,
    color: TEXT_MID,
    marginTop: 6,
  },
  financeValue: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 4,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: TEXT_MID,
    marginTop: 6,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: GREEN_MAIN,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: CARD_DARK,
    marginRight: 10,
  },
  filterButtonText: {
    color: TEXT_MID,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyCard: {
    borderRadius: 16,
    padding: 30,
    backgroundColor: CARD_DARK,
    alignItems: 'center',
  },
  emptyText: {
    color: TEXT_MID,
    fontSize: 15,
  },
  clientCard: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: CARD_DARK,
    marginBottom: 12,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_LIGHT,
    marginBottom: 6,
  },
  clientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clientStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  clientStatusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  clientTotal: {
    fontSize: 13,
    color: TEXT_MID,
  },
  expandIcon: {
    padding: 4,
  },
  clientDetails: {
    marginTop: 12,
  },
  detailDivider: {
    height: 1,
    backgroundColor: BORDER_GREY,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: TEXT_MID,
    flex: 1,
  },
  removeClientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#f44336',
    borderRadius: 8,
  },
  removeClientButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '500',
  },
  paymentsSection: {
    marginTop: 12,
  },
  paymentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_LIGHT,
    marginBottom: 10,
  },
  paymentItemRow: {
    flex: 1,
    flexDirection: 'column',
    gap: 4,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_GREY,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 6,
  },
  paymentRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  paymentDateRow: {
    fontSize: 13,
    color: TEXT_MID,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_LIGHT,
    marginRight: 12,
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  paymentStatusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  addModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    backgroundColor: CARD_DARK,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
  },
  modalSubtitle: {
    fontSize: 14,
    color: TEXT_MID,
    textAlign: 'center',
    marginVertical: 20,
  },
  modalButton: {
    backgroundColor: GREEN_MAIN,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    backgroundColor: CARD_DARK,
    padding: 20,
    alignItems: 'center',
  },
  deleteIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
    marginBottom: 6,
  },
  deleteMessage: {
    fontSize: 14,
    color: TEXT_MID,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  deleteSubmessage: {
    fontSize: 12,
    color: TEXT_MID,
    textAlign: 'center',
    marginBottom: 16,
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BORDER_GREY,
  },
  cancelButtonText: {
    color: TEXT_LIGHT,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
  },
  confirmDeleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clientSearchModal: {
    width: '95%',
    maxWidth: 500,
    maxHeight: '85%',
    backgroundColor: CARD_DARK,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'column',
  },
  reportModal: {
    width: '95%',
    maxWidth: 500,
    backgroundColor: CARD_DARK,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'column',
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    marginVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: TEXT_LIGHT,
  },
  clientList: {
    flex: 1,
    minHeight: 150,
  },
  emptySearch: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 14,
    color: TEXT_MID,
    textAlign: 'center',
  },
  clientSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_GREY,
    gap: 12,
  },
  clientSearchAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(21, 184, 106, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientSearchInfo: {
    flex: 1,
  },
  clientSearchName: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_LIGHT,
  },
  clientSearchMeta: {
    fontSize: 12,
    color: TEXT_MID,
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 4,
  },
  modalBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: GREEN_MAIN,
  },
  clientPaymentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_LIGHT,
    marginBottom: 16,
  },
  paymentMenu: {
    flex: 1,
    paddingTop: 8,
  },
  paymentMenuSubtitle: {
    fontSize: 13,
    color: TEXT_MID,
    marginBottom: 16,
  },
  paymentMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    marginBottom: 12,
    gap: 14,
  },
  paymentMenuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMenuInfo: {
    flex: 1,
  },
  paymentMenuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_LIGHT,
    marginBottom: 2,
  },
  paymentMenuDesc: {
    fontSize: 12,
    color: TEXT_MID,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_GREY,
    gap: 12,
  },
  paymentInfoRow: {
    flex: 1,
  },
  paymentDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_LIGHT,
    marginBottom: 4,
  },
  paymentDateSmall: {
    fontSize: 12,
    color: TEXT_MID,
  },
  paymentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  installmentTag: {
    backgroundColor: '#1b5e20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  installmentTagText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  paymentRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  paymentValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
    marginBottom: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_LIGHT,
  },
  installmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: GREEN_MAIN,
    borderRadius: 10,
    marginBottom: 10,
    gap: 12,
  },
  installmentInfo: {
    flex: 1,
  },
  installmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_LIGHT,
    marginBottom: 4,
  },
  installmentSubtitle: {
    fontSize: 13,
    color: TEXT_MID,
  },
  installmentRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  installmentBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  installmentMiniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  installmentMiniBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  installmentMore: {
    fontSize: 10,
    color: TEXT_MID,
    paddingHorizontal: 4,
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
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_GREY,
    gap: 16,
  },
  reportOptionText: {
    flex: 1,
  },
  reportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_LIGHT,
  },
  reportOptionDesc: {
    fontSize: 13,
    color: TEXT_MID,
    marginTop: 4,
  },
})
