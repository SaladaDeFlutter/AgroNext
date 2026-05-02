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
      const trimmed = teamId.trim() || null;
      const data: any = { teamId: trimmed };
      if (trimmed) {
        const existing = await prisma.user.findUnique({ where: { id: req.userId! } });
        const inviteCode = existing?.inviteCode || Math.random().toString(36).slice(2, 10).toUpperCase();
        data.inviteCode = inviteCode;
      } else {
        data.inviteCode = null;
      }
      const updated = await prisma.user.update({
        where: { id: req.userId! },
        select: { teamId: true, inviteCode: true },
        data,
      });
      res.json({ status: 'success', data: updated });
    } catch (error) {
      next(error);
    }
  },

  async joinTeam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { inviteCode } = req.body;
      if (typeof inviteCode !== 'string' || !inviteCode.trim()) {
        throw new AppError('Código de convite inválido', 400);
      }
      const owner = await prisma.user.findFirst({
        where: { inviteCode: inviteCode.trim().toUpperCase() },
        select: { teamId: true },
      });
      if (!owner || !owner.teamId) {
        throw new AppError('Código de convite inválido ou expirado', 404);
      }
      await prisma.user.update({
        where: { id: req.userId! },
        data: { teamId: owner.teamId, inviteCode: null },
      });
      res.json({ status: 'success', message: 'Você entrou no time', data: { teamId: owner.teamId } });
    } catch (error) {
      next(error);
    }
  },

  async getTeamInvite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { teamId: true, inviteCode: true },
      });
      res.json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  },
};
