import axios, { AxiosInstance } from 'axios';

export interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  netValue?: number;
  grossValue?: number;
  dueDate: string;
  status: string;
  paymentDate?: string;
  description?: string;
  installment?: string;
  installmentNumber?: number;
  installmentCount?: number;
  installmentValue?: number;
  totalValue?: number;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string;
  deleted?: boolean;
}

export interface AsaasInstallment {
  id: string;
  customer: string;
  value: number;
  totalValue: number;
  paymentValue: number;
  installmentCount: number;
  billingType: string;
  status?: string;
  paymentDate?: string;
  description?: string;
  expirationDay?: number;
  deleted?: boolean;
}

export class AsaasClient {
  private client: AxiosInstance;
  private accessToken: string;

  constructor(accessToken: string, baseUrl: string = 'https://api.asaas.com/v3') {
    this.accessToken = accessToken;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'access_token': accessToken,
        'Content-Type': 'application/json',
      },
    });
  }

  private async get<T>(endpoint: string, params?: Record<string, any>): Promise<T[]> {
    const results: T[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await this.client.get<{ data: T[]; hasMore: boolean; totalCount: number }>(
        endpoint,
        { params: { ...params, offset, limit } }
      );
      
      results.push(...response.data.data);
      
      if (!response.data.hasMore || results.length >= response.data.totalCount) {
        break;
      }
      
      offset += limit;
    }

    return results;
  }

  async getCustomer(id: string): Promise<AsaasCustomer> {
    const response = await this.client.get<AsaasCustomer>(`/customers/${id}`);
    return response.data;
  }

  async getCustomers(search: string): Promise<AsaasCustomer[]> {
    const response = await this.client.get<{ data: AsaasCustomer[] }>('/customers', {
      params: {
        name: search,
        limit: 5
      }
    });
    return response.data.data;
  }

  async getPayment(id: string): Promise<AsaasPayment> {
    const response = await this.client.get<AsaasPayment>(`/payments/${id}`);
    return response.data;
  }

  async getPayments(customerId?: string): Promise<AsaasPayment[]> {
    return this.get<AsaasPayment>('/payments', customerId ? { customer: customerId } : undefined);
  }

  async getInstallment(id: string): Promise<AsaasInstallment> {
    const response = await this.client.get<AsaasInstallment>(`/installments/${id}`);
    return response.data;
  }

  async getInstallments(customerId?: string): Promise<AsaasInstallment[]> {
    return this.get<AsaasInstallment>('/installments', customerId ? { customer: customerId } : undefined);
  }

  async getInstallmentPayments(installmentId: string): Promise<AsaasPayment[]> {
    return this.get<AsaasPayment>(`/installments/${installmentId}/payments`);
  }
}