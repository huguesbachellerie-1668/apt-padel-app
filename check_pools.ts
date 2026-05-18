import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPools() {
  const latestSession = await prisma.session.findFirst({
    orderBy: { date: 'desc' },
    include: {
      pools: {
        include: {
          players: { include: { user: true }, orderBy: { seed: 'asc' } }
        },
        orderBy: { level: 'asc' }
      }
    }
  });

  if (!latestSession) {
    console.log("No sessions found.");
    return;
  }

  for (const pool of latestSession.pools) {
    if (pool.level === 5 || pool.level === 6) {
      console.log(`\nPoule ${pool.level}:`);
      for (const p of pool.players) {
        console.log(`  Seed ${p.seed}: ${p.user.name} (Avg: ${p.user.averagePoints})`);
      }
    }
  }
}

checkPools().catch(console.error).finally(() => prisma.$disconnect());
