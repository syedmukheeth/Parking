import type { Prisma } from '@prisma/client';

/** The client type inside `prisma.$transaction(async (tx) => ...)`. Repository
 * methods accept an optional tx so a service can compose several repository
 * calls into one transaction (parkap-backend skill). */
export type TxClient = Prisma.TransactionClient;
