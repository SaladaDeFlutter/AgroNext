const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = {
  baseUrl: API_BASE_URL,

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
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
