import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../persistence/prisma.service';
import { Role } from '../rbac/role.enum';
import { UserDocument } from './user.schema';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string): Promise<UserDocument | null> {
    const row = await this.prisma.user.findUnique({ where: { username } });
    return row ? this.toDocument(row) : null;
  }

  async findById(id: string): Promise<UserDocument | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toDocument(row) : null;
  }

  async create(username: string, passwordHash: string, roles: Role[]): Promise<UserDocument> {
    const row = await this.prisma.user.create({
      data: {
        id: randomUUID(),
        username,
        passwordHash,
        roles: roles as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toDocument(row);
  }

  async updateRoles(id: string, roles: Role[]): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { roles: roles as unknown as Prisma.InputJsonValue },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDocument(row: any): UserDocument {
    return {
      _id: row.id,
      username: row.username,
      passwordHash: row.passwordHash,
      roles: row.roles,
      createdAt: row.createdAt,
    };
  }
}
