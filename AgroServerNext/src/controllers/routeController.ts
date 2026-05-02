import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { routeService } from '../services/routeService.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

async function getTeamUserIds(userId: string): Promise<string[]> {
  const membership = await prisma.teamMember.findFirst({
    where: { userId },
    include: { team: { include: { members: { select: { userId: true } } } } },
  });
  if (!membership) return [];
  return membership.team.members.map(m => m.userId);
}

export const routeController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, month, year, sellerId } = req.body;
      const result = await routeService.create({
        name, description, month, year,
        userId: req.userId!,
        sellerId: sellerId || undefined,
      });
      res.status(201).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teamUserIds = await getTeamUserIds(req.userId!);
      const visibleIds = [req.userId!, ...teamUserIds.filter(id => id !== req.userId)];
      const result = await routeService.findAll({ userId: { in: visibleIds } });
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const teamUserIds = await getTeamUserIds(req.userId!);
      const visibleIds = [req.userId!, ...teamUserIds];

      const route = await prisma.route.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!route) throw new AppError('Rota não encontrada', 404);
      if (!visibleIds.includes(route.userId || '')) throw new AppError('Acesso negado', 403);

      const result = await routeService.findById(id);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const teamUserIds = await getTeamUserIds(req.userId!);
      const visibleIds = [req.userId!, ...teamUserIds];

      const route = await prisma.route.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!route) throw new AppError('Rota não encontrada', 404);
      if (!visibleIds.includes(route.userId || '')) throw new AppError('Acesso negado', 403);

      await routeService.delete(id);
      res.status(200).json({ status: 'success', message: 'Rota excluída com sucesso' });
    } catch (error) {
      next(error);
    }
  },
};
