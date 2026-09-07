import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { totalMatches: { gt: 0 } }
  });

  console.log(`Found ${users.length} users to check...`);

  let updatedCount = 0;

  for (const user of users) {
    const realSessionsPlayed = user.totalMatches / 3;
    let newAverage = 0;
    
    if (realSessionsPlayed > 0) {
      if (realSessionsPlayed < 4) {
        let ghostAverage = 0;
        const histStats = user.historicalStats ? (typeof user.historicalStats === 'object' ? user.historicalStats : JSON.parse(user.historicalStats as string)) : {};
        const keys = Object.keys(histStats).sort();
        if (keys.length > 0) {
          const lastStat = histStats[keys[keys.length - 1]] as any;
          if (typeof lastStat === 'object' && lastStat !== null && 'averagePoints' in lastStat) {
            ghostAverage = Number(lastStat.averagePoints) || 0;
          } else {
            ghostAverage = Number(lastStat) || 0;
          }
        }

        if (ghostAverage > 0) {
          newAverage = (ghostAverage + user.points) / (1 + realSessionsPlayed);
        } else {
          newAverage = user.points / realSessionsPlayed;
        }
      } else {
        newAverage = user.points / realSessionsPlayed;
      }
    }

    // Update if different
    if (Math.abs(user.averagePoints - newAverage) > 0.001) {
      console.log(`Updating ${user.name}: ${user.averagePoints} -> ${newAverage}`);
      await prisma.user.update({
        where: { id: user.id },
        data: { averagePoints: newAverage }
      });
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} users.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
