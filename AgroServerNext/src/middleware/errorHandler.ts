import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

interface AppErrorLike {
  statusCode?: number;
  message: string;
}

export const errorHandler = (
  err: Error | AppErrorLike,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 600) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  console.error('ERROR:', err);

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};
