import * as React from 'react';
import { StyleSheet, View, Platform, TouchableOpacity, Pressable } from 'react-native';
import { TextInput, Button, Text, Surface, Provider as PaperProvider } from 'react-native-paper';
import { useRouter, Link } from 'expo-router';
import { ArrowLeft, Mail, Leaf } from 'lucide-react-native';

const GREEN_MAIN = '#15B86A';
const GREEN_LIGHT = '#e8f5ee';
const BG_DARK = '#0d0d0d';
const CARD_DARK = '#1f1f1f';
const INPUT_BG = '#2a2a2a';
const TEXT_LIGHT = '#f0f0f0';
const TEXT_MID = '#a0a0a0';
const BORDER_GREY = '#404040';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const onSend = () => {
    if (!email.includes('@')) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1200);
  };

  return (
    <PaperProvider>
      <View style={styles.root}>
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
          <Text style={styles.cardTitle}>Esqueceu a senha?</Text>
          <Text style={styles.cardSubtitle}>
            {sent
              ? 'Verifique seu e-mail para redefinir sua senha.'
              : 'Informe o e-mail cadastrado para receber as instruções.'}
          </Text>

          {!sent ? (
            <>
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

              <Button
                mode="contained"
                onPress={onSend}
                style={styles.button}
                loading={loading}
                buttonColor={GREEN_MAIN}
                textColor="#fff"
                disabled={loading || !email.includes('@')}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Enviar
              </Button>
            </>
          ) : (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Mail size={32} color={GREEN_MAIN} />
              </View>
              <Text style={styles.successText}>
                E-mail enviado com sucesso!
              </Text>
            </View>
          )}

          <View style={styles.footerLinks}>
            <Link href="/" asChild>
              <Pressable>
                <Text style={styles.linkText}>Lembrou? Voltar ao login</Text>
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
    borderWidth: 0,
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
    marginBottom: 24,
    lineHeight: 20,
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
    marginBottom: 0,
    backgroundColor: INPUT_BG,
    fontSize: 15,
    paddingLeft: 40,
  },
  button: {
    marginTop: 20,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1a2e22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: GREEN_MAIN,
  },
  successText: {
    fontSize: 15,
    color: TEXT_LIGHT,
    textAlign: 'center',
    fontWeight: '500',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    alignItems: 'center',
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
