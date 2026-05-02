import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import routesRoutes from './routes/routes.js';
import clientsRoutes from './routes/clients.js';
import paymentsRoutes from './routes/payments.js';
import teamsRoutes from './routes/teams.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

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
  console.log(`🚀 Server running on port ${config.port}`);
  console.log(`📦 Environment: ${config.nodeEnv}`);
});
