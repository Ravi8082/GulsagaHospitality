// Shared Prisma client used by API handlers and background processing.
import { PrismaClient } from '@prisma/client';
import { config } from './config.js';
export const db=new PrismaClient({ datasourceUrl: config.DATABASE_URL });
