import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSession() {
  const session = await prisma.session.findFirst({
    where: {
      date: {
        gte: new Date('2026-06-07T00:00:00.000Z'),
        lt: new Date('2026-06-08T00:00:00.000Z')
      }
    },
    include: {
      pools: {
        where: { level: 2 },
        include: {
          matches: {
            orderBy: { order: 'asc' }
          }
        }
      }
    }
  });

  if (!session) {
    console.log("No session found for June 7, 2026.");
    return;
  }

  console.log(`Session ID: ${session.id}, Status: ${session.status}`);
  if (session.pools.length > 0) {
    const pool2 = session.pools[0];
    console.log(`Pool 2 ID: ${pool2.id}`);
    pool2.matches.forEach(m => {
       console.log(`Match ${m.order}: ${m.team1Games} - ${m.team2Games}`);
    });
  } else {
    console.log("Pool 2 not found.");
  }
}

checkSession()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
