import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.session.findMany({
    orderBy: { date: 'desc' },
    take: 5
  });
  console.log("Dernières sessions :");
  for (const s of sessions) {
    console.log(`- ${s.id} | Date: ${s.date} | Status: ${s.status} | isCounted: ${s.isCounted}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
