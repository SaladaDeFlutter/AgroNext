import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';

export const userController = {
  async findAllSellers(_req: any, res: Response, next: NextFunction) {
    try {
      const users = await prisma.user.findMany({
        where: { role: 'seller' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        },
        orderBy: { name: 'asc' }
      });
      res.status(200).json({ status: 'success', data: users });
    } catch (error) {
      next(error);
    }
  },
};
