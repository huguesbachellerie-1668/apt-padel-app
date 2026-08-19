import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const matchesCount = await prisma.match.count();
  const sessionsCount = await prisma.session.count();
  console.log(`Matches: ${matchesCount}, Sessions: ${sessionsCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
