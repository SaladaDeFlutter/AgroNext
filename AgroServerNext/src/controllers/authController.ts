import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { authService } from '../services/authService.js';
import { verificationService } from '../services/verificationService.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

export const authController = {
  async sendVerificationCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await verificationService.sendVerificationCode(email);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async resendVerificationCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await verificationService.resendCode(email);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async register(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, email, password, code } = req.body;
      const result = await authService.register({ name, email, password, code });
      res.status(201).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.getProfile(req.userId!);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async updateTeam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { teamId } = req.body;
      if (typeof teamId !== 'string') {
        throw new AppError('teamId deve ser uma string', 400);
      }
      await prisma.user.update({
        where: { id: req.userId! },
        data: { teamId: teamId.trim() || null },
      });
      res.json({ status: 'success', message: 'Time atualizado' });
    } catch (error) {
      next(error);
    }
  },
};
