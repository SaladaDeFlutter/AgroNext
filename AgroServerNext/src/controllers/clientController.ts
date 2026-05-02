import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { getAsaasClients } from '../api/asaasFactory.js';

export const clientController = {
  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { search, limit = 50 } = req.query;
      
      const where: any = {};
      
      if (search) {
        where.name = {
          contains: String(search),
          mode: 'insensitive'
        };
      }
      
      const clients = await prisma.client.findMany({
        where,
        take: Number(limit),
        orderBy: { name: 'asc' },
        select: {
          id: true,
          asaasId: true,
          name: true,
          email: true,
          phone: true,
          mobilePhone: true,
          cpfCnpj: true,
        }
      });
      
      res.json({ status: 'success', data: clients });
    } catch (error) {
      next(error);
    }
  },

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const client = await prisma.client.findUnique({
        where: { id },
        include: {
          payments: {
            orderBy: { dueDate: 'desc' }
          }
        }
      });
      
      if (!client) {
        return res.status(404).json({ status: 'error', message: 'Cliente não encontrado' });
      }
      
      res.json({ status: 'success', data: client });
    } catch (error) {
      next(error);
    }
  },

  async findByRoute(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { routeId } = req.params;
      
      const routePayments = await prisma.routePayment.findMany({
        where: { routeId },
        include: {
          payment: {
            include: {
              client: true
            }
          }
        }
      });
      
      const clientMap = new Map<string, any>();
      routePayments.forEach(rp => {
        if (rp.payment.client && !clientMap.has(rp.payment.client.id)) {
          clientMap.set(rp.payment.client.id, rp.payment.client);
        }
      });
      
      const clients = Array.from(clientMap.values());
      
      res.json({ status: 'success', data: clients });
    } catch (error) {
      next(error);
    }
  },

  async getAvailableClients(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { routeId, search } = req.query;
      
      if (!search || String(search).length < 2) {
        return res.json({ status: 'success', data: [] });
      }
      
      const clients = getAsaasClients(req);
      const asaasCustomers: any[] = [];
      for (const client of clients) {
        try {
          const found = await client.getCustomers(String(search));
          asaasCustomers.push(...found);
        } catch (_) { continue; }
      }
      
      const availableClients = asaasCustomers.map(customer => ({
        id: customer.id,
        asaasId: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        mobilePhone: customer.mobilePhone,
        cpfCnpj: customer.cpfCnpj,
      }));
      
      res.json({ status: 'success', data: availableClients });
    } catch (error) {
      next(error);
    }
  }
};