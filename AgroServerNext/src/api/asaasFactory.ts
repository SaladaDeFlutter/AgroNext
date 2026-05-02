import { Request } from 'express';
import { AsaasClient } from './asaasClient.js';

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
  return tokens.map(token => new AsaasClient(token));
}

export function getFirstAsaasClient(req: Request): AsaasClient | null {
  const clients = getAsaasClients(req);
  return clients[0] || null;
}
