import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('[PostgreSQL] Database connection established successfully.');
  } catch (err) {
    console.warn('[PostgreSQL] Could not connect to PostgreSQL server. Running in decoupled mode.');
  }
}
