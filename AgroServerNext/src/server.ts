import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './lib/logger.js';
import authRoutes from './routes/auth.js';
import routesRoutes from './routes/routes.js';
import clientsRoutes from './routes/clients.js';
import paymentsRoutes from './routes/payments.js';
import teamsRoutes from './routes/teams.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

const morganStream = {
  write: (message: string) => logger.http(message.trim()),
};

app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: morganStream,
  skip: (_req, res) => res.statusCode < 400,
}));

app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: morganStream,
  skip: (_req, res) => res.statusCode >= 400,
}));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api', routesRoutes);
app.use('/api', clientsRoutes);
app.use('/api', paymentsRoutes);
app.use('/api', teamsRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`Server running → port ${config.port} · ${config.nodeEnv}`);
});
