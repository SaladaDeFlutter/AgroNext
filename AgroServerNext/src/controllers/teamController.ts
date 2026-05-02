import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

function generateCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase()
    + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export const teamController = {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string') throw new AppError('Nome da equipe é obrigatório', 400);

      const existing = await prisma.teamMember.findFirst({
        where: { userId: req.userId! },
        include: { team: true },
      });
      if (existing) throw new AppError('Você já pertence a uma equipe', 400);

      const team = await prisma.team.create({
        data: {
          name: name.trim(),
          inviteCode: generateCode(),
          members: {
            create: { userId: req.userId!, role: 'admin' },
          },
        },
      });

      res.status(201).json({ status: 'success', data: { id: team.id, name: team.name, inviteCode: team.inviteCode } });
    } catch (error) {
      next(error);
    }
  },

  async join(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { inviteCode } = req.body;
      if (!inviteCode || typeof inviteCode !== 'string') throw new AppError('Código de convite inválido', 400);

      const existing = await prisma.teamMember.findFirst({ where: { userId: req.userId! } });
      if (existing) throw new AppError('Você já pertence a uma equipe', 400);

      const team = await prisma.team.findUnique({ where: { inviteCode: inviteCode.trim().toUpperCase() } });
      if (!team) throw new AppError('Código de convite inválido', 404);

      await prisma.teamMember.create({
        data: { teamId: team.id, userId: req.userId!, role: 'member' },
      });

      res.json({ status: 'success', message: 'Você entrou na equipe', data: { teamId: team.id, teamName: team.name } });
    } catch (error) {
      next(error);
    }
  },

  async myTeam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const membership = await prisma.teamMember.findFirst({
        where: { userId: req.userId! },
        include: {
          team: {
            include: {
              members: {
                include: { user: { select: { id: true, name: true, email: true } } },
              },
            },
          },
        },
      });

      if (!membership) return res.json({ status: 'success', data: null });

      res.json({
        status: 'success',
        data: {
          id: membership.team.id,
          name: membership.team.name,
          inviteCode: membership.role === 'admin' ? membership.team.inviteCode : undefined,
          myRole: membership.role,
          members: membership.team.members.map(m => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async refreshInvite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const membership = await prisma.teamMember.findFirst({
        where: { userId: req.userId!, role: 'admin' },
      });
      if (!membership) throw new AppError('Apenas administradores podem regenerar o código', 403);

      const newCode = generateCode();
      await prisma.team.update({
        where: { id: membership.teamId },
        data: { inviteCode: newCode },
      });

      res.json({ status: 'success', data: { inviteCode: newCode } });
    } catch (error) {
      next(error);
    }
  },

  async removeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const adminMembership = await prisma.teamMember.findFirst({
        where: { userId: req.userId!, role: 'admin' },
      });
      if (!adminMembership) throw new AppError('Apenas administradores podem remover membros', 403);

      const target = await prisma.teamMember.findFirst({
        where: { userId, teamId: adminMembership.teamId },
      });
      if (!target) throw new AppError('Membro não encontrado na sua equipe', 404);
      if (target.userId === req.userId) throw new AppError('Você não pode remover a si mesmo', 400);

      await prisma.teamMember.delete({ where: { id: target.id } });
      res.json({ status: 'success', message: 'Membro removido' });
    } catch (error) {
      next(error);
    }
  },
};
