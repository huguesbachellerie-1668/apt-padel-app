import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ take: 5 });
  for (const u of users) {
    console.log(`User ${u.name}: historicalStats = ${JSON.stringify(u.historicalStats)}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
