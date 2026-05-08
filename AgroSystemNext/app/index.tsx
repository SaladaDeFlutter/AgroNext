import * as React from 'react';
import { StyleSheet, View, Platform, Pressable, Alert } from 'react-native';
import { TextInput, Button, Text, Surface, Provider as PaperProvider } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, Leaf } from 'lucide-react-native';
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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const onLogin = async () => {
    if (!email || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.auth.login(email, password);
      await storage.setItem('token', response.data.token);
      if (response.data?.user?.name) {
        await storage.setItem('user_name', response.data.user.name);
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaperProvider>
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Leaf size={40} color={GREEN_MAIN} />
          </View>
          <Text style={styles.appName}>AgroSystem</Text>
          <Text style={styles.appSlogan}>Sistema de Gestão Agrícola</Text>
        </View>

        <Surface style={styles.card} elevation={2}>
          <Text style={styles.cardTitle}>Entrar</Text>
          <Text style={styles.cardSubtitle}>Acesse sua conta para continuar</Text>

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
              secureTextEntry={!showPassword}
              style={[styles.input, { backgroundColor: INPUT_BG }]}
              mode="outlined"
              outlineColor={BORDER_GREY}
              activeOutlineColor={GREEN_MAIN}
              textColor={TEXT_LIGHT}
              placeholderTextColor={TEXT_MID}
            />
            <Pressable
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={18} color={TEXT_MID} />
              ) : (
                <Eye size={18} color={TEXT_MID} />
              )}
            </Pressable>
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <Button
            mode="contained"
            onPress={onLogin}
            style={styles.button}
            loading={loading}
            buttonColor={GREEN_MAIN}
            textColor="#fff"
            disabled={loading}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Entrar
          </Button>

          <View style={styles.footerLinks}>
            <Link href="/forgot-password" asChild>
              <Pressable>
                <Text style={styles.linkText}>Esqueceu a senha?</Text>
              </Pressable>
            </Link>
            <Text style={styles.separator}> | </Text>
            <Link href="/register" asChild>
              <Pressable>
                <Text style={styles.linkText}>Criar conta</Text>
              </Pressable>
            </Link>
          </View>
        </Surface>

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
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  appSlogan: {
    fontSize: 14,
    color: '#d4f0de',
    fontWeight: '400',
  },
  card: {
    marginHorizontal: 20,
    marginTop: -30,
    borderRadius: 20,
    padding: 24,
    backgroundColor: CARD_DARK,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: TEXT_LIGHT,
    marginBottom: 4,
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
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 22,
    zIndex: 1,
    padding: 2,
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
    fontWeight: '500',
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
    marginTop: 18,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 13,
    color: GREEN_MAIN,
    fontWeight: '600',
  },
  separator: {
    color: TEXT_MID,
    fontSize: 13,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingBottom: 30,
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
