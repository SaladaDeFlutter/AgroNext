import * as React from 'react';
import { StyleSheet, View, Platform, Pressable, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface, Provider as PaperProvider } from 'react-native-paper';
import { useRouter, Link } from 'expo-router';
import { ArrowLeft, Mail, Lock, User, Leaf } from 'lucide-react-native';
import { api } from '@/src/config/api';
import storage from '@/src/config/storage';

const GREEN_MAIN = '#15B86A';
const GREEN_LIGHT = '#e8f5ee';
const BG_DARK = '#0d0d0d';
const CARD_DARK = '#1f1f1f';
const INPUT_BG = '#2a2a2a';
const TEXT_LIGHT = '#f0f0f0';
const TEXT_MID = '#a0a0a0';
const BORDER_GREY = '#404040';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const onRegister = async () => {
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (!email.includes('@')) {
      setError('Digite um email válido.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.auth.register(name, email, password);
      await storage.setItem('token', response.data.token);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
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
              <Leaf size={36} color={GREEN_MAIN} />
            </View>
            <Text style={styles.appName}>AgroSystem</Text>
          </View>

          <Surface style={styles.card} elevation={2}>
            <Text style={styles.cardTitle}>Criar Conta</Text>
            <Text style={styles.cardSubtitle}>
              Preencha os dados abaixo para se cadastrar
            </Text>

            <View style={styles.inputWrapper}>
              <User size={18} color={TEXT_MID} style={styles.inputIcon} />
              <TextInput
                label="Nome completo"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                style={[styles.input, { backgroundColor: INPUT_BG }]}
                mode="outlined"
                outlineColor={BORDER_GREY}
                activeOutlineColor={GREEN_MAIN}
                textColor={TEXT_LIGHT}
                placeholderTextColor={TEXT_MID}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Mail size={18} color={TEXT_MID} style={styles.inputIcon} />
              <TextInput
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[styles.input, { backgroundColor: INPUT_BG }]}
                mode="outlined"
                outlineColor={BORDER_GREY}
                activeOutlineColor={GREEN_MAIN}
                textColor={TEXT_LIGHT}
                placeholderTextColor={TEXT_MID}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={18} color={TEXT_MID} style={styles.inputIcon} />
              <TextInput
                label="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={[styles.input, { backgroundColor: INPUT_BG }]}
                mode="outlined"
                outlineColor={BORDER_GREY}
                activeOutlineColor={GREEN_MAIN}
                textColor={TEXT_LIGHT}
                placeholderTextColor={TEXT_MID}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={18} color={TEXT_MID} style={styles.inputIcon} />
              <TextInput
                label="Confirmar senha"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                style={[styles.input, { backgroundColor: INPUT_BG }]}
                mode="outlined"
                outlineColor={BORDER_GREY}
                activeOutlineColor={GREEN_MAIN}
                textColor={TEXT_LIGHT}
                placeholderTextColor={TEXT_MID}
              />
            </View>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <Button
              mode="contained"
              onPress={onRegister}
              style={styles.button}
              loading={loading}
              buttonColor={GREEN_MAIN}
              textColor="#fff"
              disabled={loading}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Cadastrar
            </Button>

            <View style={styles.footerLinks}>
              <Link href="/" asChild>
                <Pressable>
                  <Text style={styles.linkText}>Já tem conta? Fazer login</Text>
                </Pressable>
              </Link>
            </View>
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
  inputWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 22,
    zIndex: 1,
  },
  input: {
    backgroundColor: INPUT_BG,
    fontSize: 15,
    paddingLeft: 40,
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
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  linkText: {
    fontSize: 13,
    color: GREEN_MAIN,
    fontWeight: '600',
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
