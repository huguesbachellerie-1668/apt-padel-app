import { PrismaClient } from '@prisma/client'

// Fix Neon Postgres Pooler concurrency on Vercel by appending pgbouncer=true
if (process.env.POSTGRES_PRISMA_URL && process.env.POSTGRES_PRISMA_URL.includes('-pooler.') && !process.env.POSTGRES_PRISMA_URL.includes('pgbouncer=true')) {
  process.env.POSTGRES_PRISMA_URL += `${process.env.POSTGRES_PRISMA_URL.includes('?') ? '&' : '?'}pgbouncer=true`;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    ...(process.env.POSTGRES_PRISMA_URL ? { datasources: { db: { url: process.env.POSTGRES_PRISMA_URL } } } : {})
  })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
