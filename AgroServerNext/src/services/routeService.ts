import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { Prisma } from '@prisma/client';

export const routeService = {
  async create(data: { name: string; description?: string; month: number; year: number; userId?: string; teamId?: string }) {
    const route = await prisma.route.create({
      data: {
        name: data.name,
        description: data.description,
        month: data.month,
        year: data.year,
        userId: data.userId,
        teamId: data.teamId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { payments: true }
        }
      }
    });
    return route;
  },

  async findAll(where?: Prisma.RouteWhereInput) {
    return prisma.route.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { payments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async findById(id: string) {
    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        payments: {
          select: {
            paymentId: true,
            createdAt: true,
            payment: {
              select: {
                asaasId: true,
                clientId: true,
                installmentAsaasId: true,
                installmentNumber: true,
                value: true,
                dueDate: true,
                status: true,
              }
            }
          }
        }
      }
    });
    if (!route) {
      throw new AppError('Rota não encontrada', 404);
    }

    const payments = route.payments.map(rp => ({
      id: rp.paymentId,
      asaasId: rp.payment.asaasId,
      clientId: rp.payment.clientId,
      installmentAsaasId: rp.payment.installmentAsaasId,
      installmentNumber: rp.payment.installmentNumber,
      value: rp.payment.value,
      dueDate: rp.payment.dueDate,
      status: rp.payment.status,
    }));

    return {
      ...route,
      payments,
    };
  },

  async delete(id: string) {
    const route = await prisma.route.findUnique({ where: { id } });
    if (!route) {
      throw new AppError('Rota não encontrada', 404);
    }
    
    await prisma.routePayment.deleteMany({
      where: { routeId: id }
    });
    
    await prisma.route.delete({
      where: { id }
    });
  }
};
