import { Injectable } from '@nestjs/common';
import type { User } from '@parkap/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

interface UserRow {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  role: string;
  locale: string;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    email: row.email,
    role: row.role as User['role'],
    locale: row.locale as User['locale'],
  };
}

/** All Prisma access for the auth feature lives here. New phone numbers are
 * registered on first successful OTP verification — there is no separate
 * signup (docs/API-CONTRACT.md). */
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertByPhone(phone: string): Promise<User> {
    const user = await this.prisma.user.upsert({
      where: { phone },
      create: { phone },
      update: {},
    });
    return toUser(user);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toUser(user) : null;
  }

  async update(
    id: string,
    data: { name?: string; email?: string; locale?: 'en' | 'te' },
  ): Promise<User> {
    const user = await this.prisma.user.update({ where: { id }, data });
    return toUser(user);
  }
}
