import { Response, NextFunction } from 'express';
import { routeService } from '../services/routeService.js';
import { AuthRequest } from '../middleware/auth.js';

export const routeController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, month, year, userId } = req.body;
      const result = await routeService.create({ name, description, month, year, userId });
      res.status(201).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async findAll(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await routeService.findAll();
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async findById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await routeService.findById(id);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await routeService.delete(id);
      res.status(200).json({ status: 'success', message: 'Rota excluída com sucesso' });
    } catch (error) {
      next(error);
    }
  },
};