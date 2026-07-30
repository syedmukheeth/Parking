import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { TxClient } from '../../common/prisma/tx-client';

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: { bookingId: string; provider: string; providerOrderId: string; amount: number },
    tx?: TxClient,
  ) {
    const client = tx ?? this.prisma;
    return client.payment.create({ data: { ...data, status: 'CREATED' } });
  }

  /** The idempotency lookup — checked before any webhook mutates a payment,
   * regardless of provider (docs/API-CONTRACT.md: "Handling is idempotent by
   * providerPaymentId"). */
  async findByProviderPaymentId(providerPaymentId: string, tx?: TxClient) {
    const client = tx ?? this.prisma;
    return client.payment.findUnique({ where: { providerPaymentId } });
  }

  async findById(id: string, tx?: TxClient) {
    const client = tx ?? this.prisma;
    return client.payment.findUnique({ where: { id } });
  }

  async findByProviderOrderId(providerOrderId: string, tx?: TxClient) {
    const client = tx ?? this.prisma;
    return client.payment.findFirst({ where: { providerOrderId } });
  }

  async findLatestForBooking(bookingId: string, tx?: TxClient) {
    const client = tx ?? this.prisma;
    return client.payment.findFirst({ where: { bookingId }, orderBy: { createdAt: 'desc' } });
  }

  async markSuccess(
    id: string,
    providerPaymentId: string,
    rawPayload: Prisma.InputJsonValue,
    tx?: TxClient,
  ) {
    const client = tx ?? this.prisma;
    return client.payment.update({
      where: { id },
      data: { status: 'SUCCESS', providerPaymentId, rawPayload, paidAt: new Date() },
    });
  }

  async markFailed(id: string, rawPayload: Prisma.InputJsonValue, tx?: TxClient) {
    const client = tx ?? this.prisma;
    return client.payment.update({ where: { id }, data: { status: 'FAILED', rawPayload } });
  }
}
