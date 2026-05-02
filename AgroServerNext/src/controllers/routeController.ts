import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { routeService } from '../services/routeService.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

export const routeController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, month, year } = req.body;
      const userId = req.userId!;
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
      const result = await routeService.create({
        name, description, month, year,
        userId,
        teamId: user?.teamId || undefined,
      });
      res.status(201).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async findAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
      const where: any = user?.teamId
        ? { OR: [{ teamId: user.teamId }, { userId }] }
        : { userId };
      const result = await routeService.findAll(where);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.userId!;
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
      const route = await prisma.route.findUnique({ where: { id }, select: { userId: true, teamId: true } });
      if (!route) throw new AppError('Rota não encontrada', 404);

      const canAccess = route.userId === userId || (user?.teamId && route.teamId === user.teamId);
      if (!canAccess) throw new AppError('Acesso negado', 403);

      const result = await routeService.findById(id);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.userId!;
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
      const route = await prisma.route.findUnique({ where: { id }, select: { userId: true, teamId: true } });
      if (!route) throw new AppError('Rota não encontrada', 404);

      const canAccess = route.userId === userId || (user?.teamId && route.teamId === user.teamId);
      if (!canAccess) throw new AppError('Acesso negado', 403);

      await routeService.delete(id);
      res.status(200).json({ status: 'success', message: 'Rota excluída com sucesso' });
    } catch (error) {
      next(error);
    }
  },
};
