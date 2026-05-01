import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../utils/AppError.js';
import { AsaasClient } from '../api/asaasClient.js';
import dotenv from 'dotenv';

dotenv.config();

const getAsaasClient = () => new AsaasClient(process.env.ASAAS_ACCESS_TOKEN || '');

export const paymentController = {
  async findByClient(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { clientId } = req.params;
      
      let asaasId = clientId;
      
      if (!clientId.startsWith('cus_')) {
        const dbClient = await prisma.client.findUnique({
          where: { id: clientId }
        });
        if (dbClient) {
          asaasId = dbClient.asaasId;
        } else {
          throw new AppError('Cliente não encontrado', 404);
        }
      }
      
      const asaas = getAsaasClient();
      
      const [asaasPayments, asaasInstallments] = await Promise.all([
        asaas.getPayments(asaasId),
        asaas.getInstallments(asaasId)
      ]);
      
      const uniquePayments = asaasPayments.filter(p => !p.installment);
      const installmentIds = [...new Set(asaasPayments.filter(p => p.installment).map(p => p.installment))];
      
      const installmentGroups: any[] = [];
      for (const instId of installmentIds) {
        const instPayments = asaasPayments.filter(p => p.installment === instId);
        const installment = asaasInstallments.find(i => i.id === instId);
        if (instPayments.length > 0) {
          const totalVal = instPayments.reduce((sum, p) => sum + p.value, 0);
          installmentGroups.push({
            installmentId: instId,
            totalValue: totalVal,
            installmentCount: instPayments.length,
            valuePerInstallment: instPayments.length > 0 ? totalVal / instPayments.length : 0,
            payments: instPayments.map(p => ({
              id: p.id,
              asaasId: p.id,
              billingType: p.billingType,
              value: p.value,
              dueDate: p.dueDate,
              status: p.status,
              installment: p.installment,
              installmentNumber: p.installmentNumber,
            }))
          });
        }
      }
      
      const uniquePaymentsFormatted = uniquePayments.map(p => ({
        id: p.id,
        asaasId: p.id,
        billingType: p.billingType,
        value: p.value,
        dueDate: p.dueDate,
        status: p.status,
        installmentAsaasId: null,
        installmentNumber: null,
      }));
      
      const installmentsData = installmentGroups.map(inst => ({
        installmentId: inst.installmentId,
        totalValue: inst.totalValue,
        installmentCount: inst.installmentCount,
        payments: inst.payments
      }));
      
      const singlePaymentsData = [
        ...uniquePaymentsFormatted,
        ...installmentGroups.flatMap(inst => inst.payments)
      ];
      
      res.json({ 
        status: 'success', 
        data: { 
          uniquePayments: uniquePaymentsFormatted,
          installments: installmentsData,
          singlePayments: singlePaymentsData
        } 
      });
    } catch (error) {
      next(error);
    }
  },

  async getAvailablePayments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { routeId, clientId } = req.query;
      
      const routePayments = await prisma.routePayment.findMany({
        where: { routeId: String(routeId) },
        select: { paymentId: true }
      });
      
      const assignedPaymentIds = routePayments.map(rp => rp.paymentId);
      
      const where: any = {
        id: { notIn: assignedPaymentIds }
      };
      
      if (clientId) {
        where.clientId = String(clientId);
      }
      
      const payments = await prisma.payment.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              mobilePhone: true,
            }
          }
        },
        orderBy: { dueDate: 'desc' },
        take: 100
      });
      
      res.json({ status: 'success', data: payments });
    } catch (error) {
      next(error);
    }
  },

  async addToRoute(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { routeId, paymentId } = req.body;
      
      const route = await prisma.route.findUnique({ where: { id: routeId } });
      if (!route) {
        throw new AppError('Rota não encontrada', 404);
      }
      
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (!payment) {
        throw new AppError('Pagamento não encontrado', 404);
      }
      
      const existing = await prisma.routePayment.findUnique({
        where: {
          routeId_paymentId: { routeId, paymentId }
        }
      });
      
      if (existing) {
        throw new AppError('Pagamento já está na rota', 400);
      }
      
      await prisma.routePayment.create({
        data: { routeId, paymentId },
      });
      
      res.json({ 
        status: 'success', 
        message: 'Pagamento adicionado à rota',
        data: { paymentId }
      });
    } catch (error) {
      next(error);
    }
  },

  async addInstallmentToRoute(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { routeId, installmentAsaasId } = req.body;
      
      const route = await prisma.route.findUnique({ where: { id: routeId } });
      if (!route) {
        throw new AppError('Rota não encontrada', 404);
      }
      
      const payments = await prisma.payment.findMany({
        where: { installmentAsaasId }
      });
      
      if (payments.length === 0) {
        throw new AppError('Nenhum pagamento encontrado para este parcelamento', 404);
      }
      
      const existingPayments = await prisma.routePayment.findMany({
        where: {
          routeId,
          paymentId: { in: payments.map(p => p.id) }
        },
        select: { paymentId: true }
      });
      
      const existingIds = new Set(existingPayments.map(ep => ep.paymentId));
      const newPayments = payments.filter(p => !existingIds.has(p.id));
      
      if (newPayments.length > 0) {
        await prisma.routePayment.createMany({
          data: newPayments.map(p => ({
            routeId,
            paymentId: p.id
          })),
          skipDuplicates: true
        });
      }
      
      res.json({ 
        status: 'success', 
        message: 'Parcelamento adicionado à rota',
        data: { 
          payments: newPayments.length,
          installmentAsaasId,
        } 
      });
    } catch (error) {
      next(error);
    }
  },

  async removeFromRoute(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { routeId, paymentId } = req.params;
      
      await prisma.routePayment.delete({
        where: {
          routeId_paymentId: { routeId, paymentId }
        }
      });
      
      res.json({ status: 'success', message: 'Pagamento removido da rota' });
    } catch (error) {
      next(error);
    }
  },
};