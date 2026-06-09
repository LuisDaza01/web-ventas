// Cliente Prisma único compartido por toda la app (patrón singleton).
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});
