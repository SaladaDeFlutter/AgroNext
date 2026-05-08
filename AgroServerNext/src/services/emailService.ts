import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpSecure,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
});

export const emailService = {
  async sendVerificationCode(email: string, code: string) {
    const mailOptions = {
      from: `"AgroSystem" <${config.smtpUser}>`,
      to: email,
      subject: 'Código de Verificação - AgroSystem',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #15B86A; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">AgroSystem</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Código de Verificação</h2>
            <p style="color: #666; font-size: 16px;">
              Use o código abaixo para verificar sua conta:
            </p>
            <div style="background-color: #fff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #15B86A;">
                ${code}
              </span>
            </div>
            <p style="color: #666; font-size: 14px;">
              Este código expira em <strong>15 minutos</strong>.
            </p>
            <p style="color: #999; font-size: 12px;">
              Se você não solicitou este código, ignore este email.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      logger.info(`Verification code sent to ${email}`);
    } catch (error) {
      logger.error(`Error sending email to ${email}`, error as Error);
      throw error;
    }
  },
};
