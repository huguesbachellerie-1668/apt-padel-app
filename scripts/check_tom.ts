import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTomZ() {
  const tom = await prisma.user.findFirst({
    where: {
      name: { contains: 'Tom Z', mode: 'insensitive' }
    }
  });

  if (!tom) {
    console.log("Tom Z. not found");
    return;
  }

  console.log(`Tom Z. (ID: ${tom.id})`);
  console.log(`Average Points: ${tom.averagePoints}`);
  console.log(`Last Calculated Level: ${tom.lastCalculatedLevel}`);

  const latestSession = await prisma.session.findFirst({
    orderBy: { date: 'desc' },
    include: {
      pools: {
        include: {
          players: { include: { user: true } }
        }
      }
    }
  });

  if (!latestSession) {
    console.log("No sessions found.");
    return;
  }

  console.log(`\nLatest Session ID: ${latestSession.id} (${latestSession.status})`);
  
  let foundInPool = null;
  let N = 0;
  for (const p of latestSession.pools) {
    N += p.players.length;
    for (const pp of p.players) {
      if (pp.userId === tom.id) {
        foundInPool = p;
      }
    }
  }

  console.log(`Total Players in session pools (N): ${N}`);
  if (foundInPool) {
    console.log(`Tom Z. is in Pool ${foundInPool.level}`);
  } else {
    console.log(`Tom Z. is NOT in a pool in this session.`);
  }

  const registrations = await prisma.registration.findMany({
    where: { sessionId: latestSession.id },
    include: { user: true }
  });

  const electedUsers = registrations.map(r => r.user).sort((a, b) => b.averagePoints - a.averagePoints);
  const initialPlace = electedUsers.findIndex(u => u.id === tom.id) + 1;
  console.log(`Initial Place based on averagePoints: ${initialPlace} out of ${electedUsers.length}`);

  const actualN = latestSession.pools.length * 4;
  
  if (initialPlace > 0 && actualN > 0) {
    const theoreticalLevel = Math.ceil((initialPlace * 10) / actualN);
    console.log(`Theoretical Level: ${theoreticalLevel} (with N=${actualN})`);
    
    if (tom.lastCalculatedLevel) {
      const minLevelAllowed = Math.max(1, tom.lastCalculatedLevel - 3);
      const maxLevelAllowed = Math.min(10, tom.lastCalculatedLevel + 3);
      console.log(`Allowed Level Range: ${minLevelAllowed} to ${maxLevelAllowed} (Last level was ${tom.lastCalculatedLevel})`);
      
      if (theoreticalLevel < minLevelAllowed) {
        console.log(`-> Trop haut ! Doit descendre.`);
        const targetPlace = Math.floor(((minLevelAllowed - 1) * actualN) / 10) + 1;
        console.log(`-> Should be pushed to Place: ${targetPlace} (Which means Pool ${Math.ceil(targetPlace/4)})`);
      } else if (theoreticalLevel > maxLevelAllowed) {
        console.log(`-> Trop bas ! Doit monter.`);
        const targetPlace = Math.max(1, Math.floor((maxLevelAllowed * actualN) / 10));
        console.log(`-> Should be pushed to Place: ${targetPlace} (Which means Pool ${Math.ceil(targetPlace/4)})`);
      } else {
         console.log(`-> Dans les limites, pas de mouvement forcé.`);
      }
    }
  }

}

checkTomZ().catch(console.error).finally(() => prisma.$disconnect());
