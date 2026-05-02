import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AsaasClient, AsaasPayment, AsaasCustomer, AsaasInstallment } from '../api/asaasClient.js';
import { AuthRequest } from '../middleware/auth.js';
import { getAsaasClients, getFirstAsaasClient } from '../api/asaasFactory.js';
import { AppError } from '../middleware/errorHandler.js';

const refreshProgress = new Map<string, { total: number; current: number }>();

async function getTeamUserIds(userId: string): Promise<string[]> {
  const membership = await prisma.teamMember.findFirst({
    where: { userId },
    include: { team: { include: { members: { select: { userId: true } } } } },
  });
  if (!membership) return [];
  return membership.team.members.map(m => m.userId);
}

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

      const teamUserIds = await getTeamUserIds(req.userId!);
      if (![...teamUserIds, req.userId!].includes(route.userId || '')) throw new AppError('Acesso negado', 403);

      const routePayments = await prisma.routePayment.findMany({
        where: { routeId: id },
        select: {
          paymentId: true,
          payment: {
            select: {
              asaasId: true,
              clientId: true,
              billingType: true,
              value: true,
              dueDate: true,
              status: true,
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
      const uniqueAsaasCustomerIds = [...new Set(dbClients.map(c => c.asaasId))];
      refreshProgress.set(progressKey, { total: uniqueAsaasCustomerIds.length, current: 0 });

      const uniquePayments: AsaasPaymentData[] = [];
      const installmentGroups: Record<string, InstallmentGroup> = {};

      const asaasPaymentIds = routePayments.map(rp => rp.payment.asaasId);
      const asaasPaymentSet = new Set(asaasPaymentIds);

      const customerIds = [...new Set(
        routePayments
          .map(rp => rp.payment.clientId)
          .filter((id): id is string => id !== null)
      )];

      const dbClients = customerIds.length > 0 ? await prisma.client.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, asaasId: true, name: true }
      }) : [];
      const clientAsaasMap = new Map(dbClients.map(c => [c.id, c]));
      const asaasNameMap = new Map(dbClients.map(c => [c.asaasId, c.name]));

      // Build a local fallback map keyed by asaasId
      const localPaymentMap = new Map<string, typeof routePayments[0]['payment']>();
      for (const rp of routePayments) {
        localPaymentMap.set(rp.payment.asaasId, rp.payment);
      }

      // Try each user-provided token to fetch live data, merge all results
      const clients = getAsaasClients(req);
      const asaasPaymentMap = new Map<string, AsaasPayment>();
      const customerMap = new Map<string, AsaasCustomer>();
      const installmentMap = new Map<string, AsaasInstallment>();

      for (const asaasCustomerId of uniqueAsaasCustomerIds) {
        let found = false;
        for (const client of clients) {
          try {
            const [fetchedCustomer, fetchedPayments] = await Promise.all([
              client.getCustomer(asaasCustomerId),
              client.getPayments(asaasCustomerId),
            ]);
            customerMap.set(asaasCustomerId, fetchedCustomer);
            for (const pmt of fetchedPayments) {
              if (asaasPaymentSet.has(pmt.id)) {
                asaasPaymentMap.set(pmt.id, pmt);
              }
            }
            found = true;
            break;
          } catch (_) {
            continue;
          }
        }
        if (!found) {
          customerMap.set(asaasCustomerId, {
            id: asaasCustomerId,
            name: asaasNameMap.get(asaasCustomerId) || 'Cliente',
          } as AsaasCustomer);
        }
        const prog = refreshProgress.get(progressKey);
        if (prog) prog.current++;
      }

      // Fetch installments — try each token
      const installmentIds = [...new Set(
        routePayments
          .map(rp => rp.payment.installmentAsaasId)
          .filter((i): i is string => i !== null)
      )];
      for (const instId of installmentIds) {
        for (const client of clients) {
          try {
            const installment = await client.getInstallment(instId);
            installmentMap.set(instId, installment);
            break;
          } catch (_) {
            continue;
          }
        }
      }

      // Build response using asaas data when available, fallback to local DB
      for (const routePayment of routePayments) {
        const p = routePayment.payment;
        const asaasPayment = asaasPaymentMap.get(p.asaasId);
        const client = p.clientId ? clientAsaasMap.get(p.clientId) : null;
        const customerId = client?.asaasId || p.clientId || '';

        let paymentData: AsaasPaymentData;

        if (asaasPayment) {
          paymentData = {
            ...asaasPayment,
            customerData: customerMap.get(customerId),
          } as AsaasPaymentData;
        } else {
          paymentData = {
            id: p.asaasId,
            customer: customerId,
            billingType: p.billingType,
            value: p.value,
            dueDate: p.dueDate.toISOString().split('T')[0],
            status: p.status,
            installment: p.installmentAsaasId || undefined,
            installmentNumber: p.installmentNumber || undefined,
            customerData: customerMap.get(customerId),
          } as AsaasPaymentData;
        }

        if (paymentData.installment) {
          if (!installmentGroups[paymentData.installment]) {
            const installment = installmentMap.get(paymentData.installment);
            const customer = customerMap.get(customerId);

            installmentGroups[paymentData.installment] = {
              installmentId: paymentData.installment,
              customerId,
              customerName: customer?.name || 'Cliente',
              totalValue: installment?.totalValue || installment?.value || 0,
              installmentCount: installment?.installmentCount || 0,
              valuePerInstallment: installment?.paymentValue || (installment?.value || 0) / (installment?.installmentCount || 1),
              status: paymentData.status,
              dueDate: paymentData.dueDate,
              customerData: customer,
              installmentData: installment,
              payments: []
            };
          }

          installmentGroups[paymentData.installment].payments.push({
            ...paymentData,
            customerData: customerMap.get(customerId)
          });
        } else {
          uniquePayments.push({
            ...paymentData,
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
      const asaas = getFirstAsaasClient(req);
      if (!asaas) return res.status(400).json({ status: 'error', message: 'Nenhuma chave da API configurada. Adicione em Config > Chaves da API.' });

      const route = await prisma.route.findUnique({ where: { id: routeId } });
      if (!route) {
        return res.status(404).json({ status: 'error', message: 'Rota não encontrada' });
      }

      const userId = req.userId!;
      const userData = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
      const canAccess = route.userId === userId || (userData?.teamId && route.teamId === userData.teamId);
      if (!canAccess) throw new AppError('Acesso negado', 403);

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
      const asaas = getFirstAsaasClient(req);
      if (!asaas) return res.status(400).json({ status: 'error', message: 'Nenhuma chave da API configurada. Adicione em Config > Chaves da API.' });

      const route = await prisma.route.findUnique({ where: { id: routeId } });
      if (!route) {
        return res.status(404).json({ status: 'error', message: 'Rota não encontrada' });
      }

      const userId = req.userId!;
      const userData = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
      const canAccess = route.userId === userId || (userData?.teamId && route.teamId === userData.teamId);
      if (!canAccess) throw new AppError('Acesso negado', 403);

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

      const userId = req.userId!;
      const userData = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
      const canAccess = route.userId === userId || (userData?.teamId && route.teamId === userData.teamId);
      if (!canAccess) throw new AppError('Acesso negado', 403);

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