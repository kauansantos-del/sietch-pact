import pino from 'pino';
import { env, isProduction } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  // Em produção: JSON estruturado (lê melhor em qualquer agregador)
  // Em dev: pretty-printed se pino-pretty estiver disponível
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      },
  // Redact de campos sensíveis — JAMAIS logar tokens, secrets ou cookies
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.token',
      '*.idToken',
      '*.id_token',
      '*.accessToken',
      '*.access_token',
      '*.refreshToken',
      '*.refresh_token',
      '*.JWT_SECRET',
      '*.GOOGLE_CLIENT_SECRET',
      '*.DATABASE_URL',
    ],
    censor: '[REDACTED]',
  },
});
