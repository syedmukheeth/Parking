import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { TxClient } from '../../common/prisma/tx-client';

const WITH_BOOKING = {
  booking: { include: { location: true } },
} satisfies Prisma.TicketInclude;

export type TicketWithBooking = Prisma.TicketGetPayload<{ include: typeof WITH_BOOKING }>;

@Injectable()
export class TicketRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByBookingId(bookingId: string) {
    return this.prisma.ticket.findUnique({ where: { bookingId } });
  }

  async create(data: { bookingId: string; token: string; expiresAt: Date }, tx?: TxClient) {
    const client = tx ?? this.prisma;
    return client.ticket.create({ data });
  }

  /** Fetched inside the Serializable verify/exit transaction - the row lock
   * this implies is what makes usedAt/checkedOutAt replay-safe. */
  async findByTokenWithBooking(token: string, tx: TxClient): Promise<TicketWithBooking | null> {
    return tx.ticket.findUnique({ where: { token }, include: WITH_BOOKING });
  }

  async markCheckedIn(id: string, staffUserId: string, tx: TxClient) {
    const now = new Date();
    return tx.ticket.update({
      where: { id },
      data: { usedAt: now, checkedInAt: now, checkedInBy: staffUserId },
    });
  }

  async markCheckedOut(id: string, staffUserId: string, tx: TxClient) {
    return tx.ticket.update({
      where: { id },
      data: { checkedOutAt: new Date(), checkedOutBy: staffUserId },
    });
  }
}
