import { PrismaClient } from '@prisma/client';

/**
 * apps/worker gets its own PrismaClient - unlike apps/web, a background job
 * processor is a trusted backend process, not a browser client, so direct DB
 * access here doesn't violate "web never touches the DB directly"
 * (docs/ARCHITECTURE.md §2; apps/worker already lists @prisma/client as a
 * dependency for exactly this).
 */
export const prisma = new PrismaClient();
