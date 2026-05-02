import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface AsaasToken {
  id: string;
  name: string;
  token: string;
  active: boolean;
  createdAt: string;
}

const TOKENS_KEY = 'asaas_tokens';

export async function getActiveTokens(): Promise<AsaasToken[]> {
  const raw = await AsyncStorage.getItem(TOKENS_KEY);
  if (!raw) return [];
  const tokens: AsaasToken[] = JSON.parse(raw);
  return tokens.filter(t => t.active);
}

export async function getAllTokens(): Promise<AsaasToken[]> {
  const raw = await AsyncStorage.getItem(TOKENS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveTokens(tokens: AsaasToken[]): Promise<void> {
  await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export async function getAsaasTokenHeader(): Promise<Record<string, string>> {
  const active = await getActiveTokens();
  if (active.length === 0) return {};
  return { 'asaas-token': active.map(t => t.token).join(',') };
}

export async function getFullHeaders(jwtToken?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;
  const asaasHeader = await getAsaasTokenHeader();
  Object.assign(headers, asaasHeader);
  return headers;
}

function mergeHeaders(...sources: (Record<string, string> | undefined)[]): Record<string, string> {
  return Object.assign({}, ...sources.filter(Boolean));
}

export const api = {
  baseUrl: API_BASE_URL,

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const asaasHeader = await getAsaasTokenHeader();

    const config: RequestInit = {
      headers: mergeHeaders({ 'Content-Type': 'application/json' }, asaasHeader, options.headers as Record<string, string> | undefined),
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async get<T>(endpoint: string, jwtToken?: string): Promise<T> {
    const headers = await getFullHeaders(jwtToken);
    return api.request<T>(endpoint, { headers });
  },

  async post<T>(endpoint: string, body: any, jwtToken?: string): Promise<T> {
    const headers = await getFullHeaders(jwtToken);
    return api.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  },

  async del<T>(endpoint: string, jwtToken?: string): Promise<T> {
    const headers = await getFullHeaders(jwtToken);
    return api.request<T>(endpoint, { method: 'DELETE', headers });
  },

  auth: {
    register: (name: string, email: string, password: string) =>
      api.request<{ status: string; data: { user: any; token: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),

    login: (email: string, password: string) =>
      api.request<{ status: string; data: { user: any; token: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    getProfile: (token: string) =>
      api.request<{ status: string; data: any }>('/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      }),
  },
};
