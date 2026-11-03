// Parse and validate required environment variables once so invalid deployments fail during startup.
import 'dotenv/config';
import { z } from 'zod';
import { normalizeMysqlUrl } from './mysql-connection.js';
if (process.env.DATABASE_URL) process.env.DATABASE_URL = normalizeMysqlUrl(process.env.DATABASE_URL);
const env=z.object({
  DATABASE_URL:z.string().url(),
  SESSION_SECRET:z.string().min(32),
  OTP_SECRET:z.string().min(32),
  FRONTEND_URL:z.string().url(),
  API_PUBLIC_URL:z.string().url().default('http://localhost:4000'),
  CORS_ALLOWED_ORIGINS:z.string().min(1),
  MAIL_PROVIDER:z.enum(['smtp','resend']).default('smtp'),
  MAIL_HOST:z.string().min(1).optional(),
  MAIL_PORT:z.coerce.number().int().optional(),
  MAIL_USERNAME:z.string().min(1).optional(),
  MAIL_PASSWORD:z.string().min(1).optional(),
  RESEND_API_KEY:z.preprocess(value=>value===''?undefined:value,z.string().min(1).optional()),
  MAIL_FROM_ADDRESS:z.string().email(),
  COMPANY_NOTIFICATION_EMAIL:z.string().email(),
  STORAGE_TYPE:z.enum(['local','s3']).default('local')
}).parse(process.env);
export const config={...env,production:process.env.NODE_ENV==='production',origins:env.CORS_ALLOWED_ORIGINS.split(',').map(x=>x.trim()),port:Number(process.env.PORT||4000)};
if(config.production && config.origins.some(x=>!x.startsWith('https://')))throw new Error('Production requires HTTPS origins');
