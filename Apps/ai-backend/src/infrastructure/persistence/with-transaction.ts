import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export type PrismaTransactionClient = Prisma.TransactionClient;

export async function withTransaction<T>(
  prisma: PrismaService,
  work: (tx: PrismaTransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction((tx) => work(tx));
}
