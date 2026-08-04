import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { totalMatches: { gt: 0 } }
  });

  console.log(`Archiving ${users.length} users...`);

  for (const user of users) {
    const historicalStats = user.historicalStats ? (typeof user.historicalStats === 'object' ? { ...user.historicalStats } : JSON.parse(user.historicalStats)) : {};
    
    historicalStats['2025-2026'] = user.averagePoints || 0;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        historicalStats,
        points: 0,
        totalMatches: 0
        // We leave averagePoints untouched so it serves as the baseline until their first match.
      }
    });
    console.log(`Archived ${user.name}: ${historicalStats['2025-2026']} pts`);
  }

  console.log("Done.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
