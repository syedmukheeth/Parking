import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { TxClient } from '../../common/prisma/tx-client';

const DETAIL_INCLUDE = {
  payments: { orderBy: { createdAt: 'desc' as const } },
  ticket: true,
} satisfies Prisma.BookingInclude;

export type BookingDetailRow = Prisma.BookingGetPayload<{ include: typeof DETAIL_INCLUDE }>;

@Injectable()
export class BookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Opens (or reuses) a Serializable transaction. Isolation matters here:
   * two racing transactions attempting the last slot must not both observe
   * "capacity available" - Serializable forces one to fail with Postgres
   * error 40001, which the caller retries a bounded number of times
   * (parkap-backend skill). */
  runInTransaction<T>(fn: (tx: TxClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10_000 });
  }

  async getSlotTypeWithPricing(slotTypeId: string, tx?: TxClient) {
    const client = tx ?? this.prisma;
    return client.slotType.findUnique({
      where: { id: slotTypeId },
      include: { pricingRules: true, location: true },
    });
  }

  /**
   * The correctness-core query (docs/DATA-MODEL.md). Strict inequality on
   * both overlap bounds - a booking ending at 14:00 does not conflict with
   * one starting at 14:00; `<=` would silently halve capacity at every hour
   * boundary.
   *
   * Deliberately counts unexpired PENDING rows alongside CONFIRMED/ACTIVE,
   * not just the cache hold, so the guarantee holds even if Redis is slow or
   * briefly unavailable - the row inserted inside this same transaction *is*
   * the hold as far as Postgres serialization is concerned. The separate
   * Redis hold (BookingHoldStore) is the fast, advisory signal for realtime
   * and the UI; it never has to be correct on its own for safety.
   */
  async countOverlapping(
    slotTypeId: string,
    startAt: Date,
    endAt: Date,
    now: Date,
    tx?: TxClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    return client.booking.count({
      where: {
        slotTypeId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        OR: [{ status: { in: ['CONFIRMED', 'ACTIVE'] } }, { status: 'PENDING', holdExpiresAt: { gt: now } }],
      },
    });
  }

  async create(
    data: {
      userId: string;
      locationId: string;
      slotTypeId: string;
      vehicleNumber: string;
      vehicleType: Prisma.BookingCreateInput['vehicleType'];
      startAt: Date;
      endAt: Date;
      quotedAmount: number;
      holdExpiresAt: Date;
    },
    tx: TxClient,
  ) {
    return tx.booking.create({
      data: { ...data, status: 'PENDING' },
    });
  }

  async findByIdRaw(id: string, tx?: TxClient) {
    const client = tx ?? this.prisma;
    return client.booking.findUnique({ where: { id } });
  }

  async findByIdWithDetail(id: string): Promise<BookingDetailRow | null> {
    return this.prisma.booking.findUnique({ where: { id }, include: DETAIL_INCLUDE });
  }

  async findMine(
    userId: string,
    filters: { status?: Prisma.BookingWhereInput['status']; upcoming?: boolean; page: number; limit: number },
  ) {
    const where: Prisma.BookingWhereInput = {
      userId,
      ...(filters.status && { status: filters.status }),
      ...(filters.upcoming && { startAt: { gte: new Date() } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { items, total };
  }

  async updateStatus(
    id: string,
    status: Prisma.BookingUpdateInput['status'],
    extra: Prisma.BookingUpdateInput,
    tx?: TxClient,
  ) {
    const client = tx ?? this.prisma;
    return client.booking.update({ where: { id }, data: { status, ...extra } });
  }

  async updateEndAtAndAmount(
    id: string,
    endAt: Date,
    finalAmount: number,
    tx?: TxClient,
  ) {
    const client = tx ?? this.prisma;
    return client.booking.update({ where: { id }, data: { endAt, finalAmount } });
  }

  /** Adds an overstay charge without touching `endAt` - the booked window is
   * historical fact; only the amount owed grows. */
  async addOverstayCharge(id: string, overstayAmount: number, tx: TxClient) {
    const current = await tx.booking.findUniqueOrThrow({ where: { id } });
    const finalAmount = (current.finalAmount ?? current.quotedAmount) + overstayAmount;
    return tx.booking.update({ where: { id }, data: { finalAmount } });
  }
}
