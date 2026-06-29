const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessionDate = new Date('2026-06-28');
  const start = new Date(sessionDate);
  start.setHours(0,0,0,0);
  const end = new Date(sessionDate);
  end.setHours(23,59,59,999);

  const session = await prisma.session.findFirst({
    where: { date: { gte: start, lte: end } }
  });

  const pool = await prisma.pool.findFirst({
    where: { sessionId: session.id, level: 2 },
    include: { 
      matches: {
        include: {
          team1Player1: true,
          team1Player2: true,
          team2Player1: true,
          team2Player2: true
        }
      }
    }
  });

  for (const match of pool.matches) {
    console.log(`Match ${match.order} (ID: ${match.id})`);
    console.log(`  Team 1: ${match.team1Player1.name} & ${match.team1Player2.name} [Score: ${match.team1Games}]`);
    console.log(`  Team 2: ${match.team2Player1.name} & ${match.team2Player2.name} [Score: ${match.team2Games}]`);
  }
}
main().finally(() => prisma.$disconnect());
