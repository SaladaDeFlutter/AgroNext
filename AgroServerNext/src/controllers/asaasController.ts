import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AsaasClient, AsaasPayment, AsaasCustomer, AsaasInstallment } from '../api/asaasClient.js';
import { AuthRequest } from '../middleware/auth.js';
import { config } from '../config/index.js';

const asaas = new AsaasClient(config.asaasAccessToken);

const refreshProgress = new Map<string, { total: number; current: number }>();

export function getRefreshProgress(routeId: string) {
  return refreshProgress.get(`route-${routeId}`) || null;
}

interface RoutePaymentData {
  paymentId: string;
  paymentAsaasId: string;
  customerAsaasId: string;
  installmentAsaasId: string | null;
  installmentNumber: number | null;
  clientName: string;
  clientPhone: string | null;
  clientMobilePhone: string | null;
}

interface AsaasPaymentData extends AsaasPayment {
  customerData?: AsaasCustomer;
  installmentData?: AsaasInstallment;
  installmentPayments?: AsaasPayment[];
}

interface InstallmentGroup {
  installmentId: string;
  customerId: string;
  customerName: string;
  totalValue: number;
  installmentCount: number;
  valuePerInstallment: number;
  status: string;
  dueDate: string;
  customerData?: AsaasCustomer;
  installmentData?: AsaasInstallment;
  payments: AsaasPaymentData[];
}

export const asaasController = {
  async getRouteAsaasData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const route = await prisma.route.findUnique({ where: { id } });
      if (!route) {
        return res.status(404).json({ status: 'error', message: 'Rota não encontrada' });
      }

      const routePayments = await prisma.routePayment.findMany({
        where: { routeId: id },
        select: {
          paymentId: true,
          payment: {
            select: {
              asaasId: true,
              clientId: true,
              installmentAsaasId: true,
              installmentNumber: true,
            }
          }
        }
      });

      const routeClients = await prisma.routeClient.findMany({
        where: { routeId: id },
      });
      const rcIds = routeClients.map(rc => rc.clientId);
      const rcClients = rcIds.length > 0 ? await prisma.client.findMany({
        where: { id: { in: rcIds } },
        select: { id: true, asaasId: true }
      }) : [];
      const asaasByClientId = new Map(rcClients.map(c => [c.id, c.asaasId]));
      const fichaMap = new Map<string, string>();
      for (const rc of routeClients) {
        const asaasId = asaasByClientId.get(rc.clientId);
        if (asaasId && rc.fichaNumber) {
          fichaMap.set(asaasId, rc.fichaNumber);
        }
      }

      if (routePayments.length === 0) {
        return res.json({
          status: 'success',
          data: {
            routeId: id,
            routeName: route.name,
            uniquePayments: [],
            installmentGroups: []
          }
        });
      }

      const progressKey = `route-${id}`;
      refreshProgress.set(progressKey, { total: routePayments.length, current: 0 });

      const uniquePayments: AsaasPaymentData[] = [];
      const installmentGroups: Record<string, InstallmentGroup> = {};

      const installmentIds = [...new Set(
        routePayments
          .map(rp => rp.payment.installmentAsaasId)
          .filter((id): id is string => id !== null)
      )];

      const customerIds = [...new Set(
        routePayments
          .map(rp => rp.payment.clientId)
          .filter((id): id is string => id !== null)
      )];

      const installmentMap = new Map<string, AsaasInstallment>();
      const customerMap = new Map<string, AsaasCustomer>();

      for (const installmentId of installmentIds) {
        try {
          const installment = await asaas.getInstallment(installmentId);
          installmentMap.set(installmentId, installment);

          const customer = await asaas.getCustomer(installment.customer);
          customerMap.set(installment.customer, customer);
        } catch (err) {
          console.log(`Erro ao buscar installment ${installmentId}:`, err);
        }
      }

      for (const routePayment of routePayments) {
        let payment: AsaasPaymentData | null = null;

        try {
          payment = { ...(await asaas.getPayment(routePayment.payment.asaasId)) } as AsaasPaymentData;
        } catch (err) {
          console.log(`Erro ao buscar payment ${routePayment.payment.asaasId}:`, err);
          continue;
        }

        const customerId = payment.customer;

        if (!customerMap.has(customerId)) {
          try {
            const customer = await asaas.getCustomer(customerId);
            customerMap.set(customerId, customer);
          } catch (err) {
            console.log(`Erro ao buscar customer ${customerId}, usando fallback:`, err);
            customerMap.set(customerId, { id: customerId, name: 'Cliente', cpfCnpj: undefined });
          }
        }

        const prog = refreshProgress.get(progressKey);
        if (prog) prog.current++;

        if (payment.installment) {
          if (!installmentGroups[payment.installment]) {
            const installment = installmentMap.get(payment.installment);
            const customer = customerMap.get(customerId);

            installmentGroups[payment.installment] = {
              installmentId: payment.installment,
              customerId,
              customerName: customer?.name || 'Cliente',
              totalValue: installment?.totalValue || installment?.value || 0,
              installmentCount: installment?.installmentCount || 0,
              valuePerInstallment: installment?.paymentValue || (installment?.value || 0) / (installment?.installmentCount || 1),
              status: payment.status,
              dueDate: payment.dueDate,
              customerData: customer,
              installmentData: installment,
              payments: []
            };
          }

          installmentGroups[payment.installment].payments.push({
            ...payment,
            customerData: customerMap.get(customerId)
          });
        } else {
          uniquePayments.push({
            ...payment,
            customerData: customerMap.get(customerId)
          });
        }
      }

      for (const group of Object.values(installmentGroups)) {
        group.payments.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
        // Recalculate totalValue/valuePerInstallment from actual payment values
        // to avoid inconsistencies from the Asaas installment API (totalValue may be per-payment)
        const totalFromPayments = group.payments.reduce((sum, p) => sum + (p.value || 0), 0);
        if (totalFromPayments > 0) {
          group.totalValue = totalFromPayments;
          group.valuePerInstallment = group.installmentCount > 0
            ? totalFromPayments / group.installmentCount
            : 0;
        }
      }

      refreshProgress.delete(progressKey);
      res.json({
        status: 'success',
        data: {
          routeId: id,
          routeName: route.name,
          uniquePayments,
          installmentGroups: Object.values(installmentGroups),
          routeClients: Object.fromEntries(fichaMap)
        }
      });
    } catch (error) {
      refreshProgress.delete(`route-${id}`);
      next(error);
    }
  },

  async addPaymentToRoute(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { routeId, paymentAsaasId, fichaNumber } = req.body;

      const route = await prisma.route.findUnique({ where: { id: routeId } });
      if (!route) {
        return res.status(404).json({ status: 'error', message: 'Rota não encontrada' });
      }

      const payment = await asaas.getPayment(paymentAsaasId);
      
      let client = await prisma.client.findFirst({
        where: { asaasId: payment.customer }
      });

      if (!client) {
        const customer = await asaas.getCustomer(payment.customer);
        client = await prisma.client.create({
          data: {
            asaasId: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            mobilePhone: customer.mobilePhone,
          }
        });
      }

      let dbPayment = await prisma.payment.findFirst({
        where: { asaasId: paymentAsaasId }
      });

      if (!dbPayment) {
        dbPayment = await prisma.payment.create({
          data: {
            asaasId: payment.id,
            clientId: client.id,
            billingType: payment.billingType,
            value: payment.value,
            dueDate: new Date(payment.dueDate),
            status: payment.status,
            installmentAsaasId: payment.installment || null,
            installmentNumber: payment.installmentNumber || null,
          }
        });
      }

      const existing = await prisma.routePayment.findUnique({
        where: {
          routeId_paymentId: { routeId, paymentId: dbPayment.id }
        }
      });

      if (existing) {
        return res.status(400).json({ status: 'error', message: 'Pagamento já está na rota' });
      }

      await prisma.routePayment.create({
        data: { routeId, paymentId: dbPayment.id }
      });

      if (fichaNumber !== undefined) {
        await prisma.routeClient.upsert({
          where: { routeId_clientId: { routeId, clientId: client.id } },
          update: { fichaNumber },
          create: { routeId, clientId: client.id, fichaNumber },
        });
      }

      // Get customer data for the response
      const customer = await asaas.getCustomer(payment.customer);

      res.json({
        status: 'success',
        message: 'Pagamento adicionado à rota',
        data: {
          paymentId: dbPayment.id,
          paymentAsaasId,
          fichaNumber: fichaNumber || null,
          payment: {
            ...payment,
            customerData: customer
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async addInstallmentToRoute(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { routeId, installmentAsaasId, fichaNumber } = req.body;

      const route = await prisma.route.findUnique({ where: { id: routeId } });
      if (!route) {
        return res.status(404).json({ status: 'error', message: 'Rota não encontrada' });
      }

      const installmentPayments = await asaas.getInstallmentPayments(installmentAsaasId);
      
      if (installmentPayments.length === 0) {
        return res.status(404).json({ status: 'error', message: 'Nenhum pagamento encontrado' });
      }

      const customerId = installmentPayments[0].customer;
      
      let client = await prisma.client.findFirst({
        where: { asaasId: customerId }
      });

      if (!client) {
        const customer = await asaas.getCustomer(customerId);
        client = await prisma.client.create({
          data: {
            asaasId: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            mobilePhone: customer.mobilePhone,
          }
        });
      }

      const createdPayments: string[] = [];

      for (const payment of installmentPayments) {
        let dbPayment = await prisma.payment.findFirst({
          where: { asaasId: payment.id }
        });

        if (!dbPayment) {
          dbPayment = await prisma.payment.create({
            data: {
              asaasId: payment.id,
              clientId: client.id,
              billingType: payment.billingType,
              value: payment.value,
              dueDate: new Date(payment.dueDate),
              status: payment.status,
              installmentAsaasId: payment.installment || null,
              installmentNumber: payment.installmentNumber || null,
            }
          });
        }

        const existing = await prisma.routePayment.findUnique({
          where: {
            routeId_paymentId: { routeId, paymentId: dbPayment.id }
          }
        });

        if (!existing) {
          await prisma.routePayment.create({
            data: { routeId, paymentId: dbPayment.id }
          });
          createdPayments.push(dbPayment.id);
        }
      }

      if (fichaNumber !== undefined) {
        await prisma.routeClient.upsert({
          where: { routeId_clientId: { routeId, clientId: client.id } },
          update: { fichaNumber },
          create: { routeId, clientId: client.id, fichaNumber },
        });
      }

      const installment = await asaas.getInstallment(installmentAsaasId);
      const customer = await asaas.getCustomer(customerId);

      res.json({
        status: 'success',
        message: 'Parcelamento adicionado à rota',
        data: {
          payments: createdPayments.length,
          installmentAsaasId,
          fichaNumber: fichaNumber || null,
          installmentGroup: {
            installmentId: installment.id,
            customerId,
            customerName: customer.name,
            totalValue: installmentPayments.reduce((sum, p) => sum + (p.value || 0), 0),
            installmentCount: installment.installmentCount,
            valuePerInstallment: installment.paymentValue || installment.value / installment.installmentCount,
            status: installmentPayments[0].status,
            dueDate: installmentPayments[0].dueDate,
            customerData: customer,
            installmentData: installment,
            payments: installmentPayments.map(p => ({
              ...p,
              customerData: customer
            }))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async removePaymentFromRoute(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { routeId, paymentId } = req.params;

      const route = await prisma.route.findUnique({ where: { id: routeId } });
      if (!route) {
        return res.status(404).json({ status: 'error', message: 'Rota não encontrada' });
      }

      const dbPayment = await prisma.payment.findFirst({
        where: { asaasId: paymentId }
      });
      
      if (!dbPayment) {
        return res.status(404).json({ status: 'error', message: 'Pagamento não encontrado' });
      }

      await prisma.routePayment.delete({
        where: {
          routeId_paymentId: { routeId, paymentId: dbPayment.id }
        }
      });

      res.json({ status: 'success', message: 'Pagamento removido da rota' });
    } catch (error) {
      next(error);
    }
  }
};