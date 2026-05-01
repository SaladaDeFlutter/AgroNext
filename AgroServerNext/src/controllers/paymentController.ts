import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { AsaasClient } from '../api/asaasClient.js';
import dotenv from 'dotenv';

dotenv.config();

const asaas = new AsaasClient(process.env.ASAAS_ACCESS_TOKEN || '');

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

};