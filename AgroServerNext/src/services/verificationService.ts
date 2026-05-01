import prisma from '../lib/prisma.js';
import { emailService } from './emailService.js';
import { AppError } from '../middleware/errorHandler.js';

const CODE_LENGTH = 6;
const CODE_EXPIRY_MINUTES = 15;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const verificationService = {
  async sendVerificationCode(email: string) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser?.verified) {
      throw new AppError('Este email já está verificado', 400);
    }

    if (existingUser) {
      throw new AppError('Este email já está cadastrado', 400);
    }

    await prisma.verificationCode.deleteMany({
      where: { email },
    });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        email,
        code,
        expiresAt,
      },
    });

    try {
      await emailService.sendVerificationCode(email, code);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new AppError('Falha ao enviar email de verificação', 500);
    }

    return { message: 'Código enviado para o email' };
  },

  async verifyCode(email: string, code: string) {
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        email,
        code,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationCode) {
      throw new AppError('Código inválido ou expirado', 400);
    }

    await prisma.verificationCode.delete({
      where: { id: verificationCode.id },
    });

    return { verified: true };
  },

  async resendCode(email: string) {
    return this.sendVerificationCode(email);
  },
};
