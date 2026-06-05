import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTomZ() {
  const users = await prisma.user.findMany({
    where: {
      nickname: { contains: 'TomZ', mode: 'insensitive' }
    }
  });

  if (users.length === 0) {
    console.log("TomZ not found!");
    
    const allUsers = await prisma.user.findMany();
    console.log("All users:");
    allUsers.forEach(u => console.log(u.nickname || u.name));
    return;
  }

  const tomZ = users[0];
  console.log(`Found TomZ: ${tomZ.name} (avg points: ${tomZ.averagePoints})`);

  // Find the session on June 7, 2026
  const session = await prisma.session.findFirst({
    where: {
      date: {
        gte: new Date('2026-06-07T00:00:00.000Z'),
        lt: new Date('2026-06-08T00:00:00.000Z')
      }
    },
    include: {
      pools: {
        include: {
          players: {
            include: { user: true }
          }
        }
      }
    }
  });

  if (!session) {
    console.log("No session found on June 7, 2026");
    return;
  }

  console.log(`Found Session: ${session.id} status: ${session.status}`);
  
  session.pools.forEach(p => {
    console.log(`\nPool ${p.level}:`);
    p.players.forEach(pl => {
      console.log(`- Seed ${pl.seed}: ${pl.user.nickname || pl.user.name} (Avg: ${pl.user.averagePoints})`);
    });
  });

}

checkTomZ()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
