import { Request } from 'express';
import { AsaasClient } from './asaasClient.js';
import { config } from '../config/index.js';

function parseTokens(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(',') : value;
  return raw
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

export function getAsaasClients(req: Request): AsaasClient[] {
  const tokens = parseTokens(req.headers['asaas-token']);
  const fallback = config.asaasAccessToken;

  if (tokens.length === 0 && fallback) {
    return [new AsaasClient(fallback)];
  }

  return tokens.map(token => new AsaasClient(token));
}

export function getFirstAsaasClient(req: Request): AsaasClient {
  const clients = getAsaasClients(req);
  return clients[0] || new AsaasClient(config.asaasAccessToken);
}
