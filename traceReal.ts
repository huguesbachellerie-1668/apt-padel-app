import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkRealTrace() {
  const activeSession = await prisma.session.findFirst({
    where: { status: 'POULES_GENEREES' },
    orderBy: { date: 'desc' }
  });

  const sessionId = activeSession.id;
  const courtsCount = 9;

  const registrations = await prisma.registration.findMany({
    where: { sessionId },
    include: { user: true },
    orderBy: { createdAt: 'asc' }
  });

  const lastSession = await prisma.session.findFirst({
    where: { status: 'TERMINEE' },
    orderBy: { date: 'desc' },
    include: { pools: { include: { players: true } } }
  });
  const lastSessionUserIds = new Set<string>();
  if (lastSession) {
    lastSession.pools.forEach((p: any) => p.players.forEach((pp: any) => lastSessionUserIds.add(pp.userId)));
  }

  const sortedRegs = [...registrations].sort((a, b) => {
    const aLast = lastSessionUserIds.has(a.userId) ? 1 : 0;
    const bLast = lastSessionUserIds.has(b.userId) ? 1 : 0;
    if (aLast !== bLast) return bLast - aLast;

    const aMem = (a.user.totalMatches && a.user.totalMatches > 0) ? 1 : 0;
    const bMem = (b.user.totalMatches && b.user.totalMatches > 0) ? 1 : 0;
    if (aMem !== bMem) return bMem - aMem;

    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const selectedRegistrations = sortedRegs.slice(0, 36);
  const N = 36;
  const electedUsers = selectedRegistrations.map((r: any) => r.user).sort((a: any, b: any) => b.averagePoints - a.averagePoints);
  
  electedUsers.forEach((u, i) => {
     if(u.name.includes('Lucien')) console.log(`[Trace] Lucien sorted at Index: ${i} (Avg: ${u.averagePoints})`);
  });

  const finalUsers = [...electedUsers];
  const movedUserIds = new Set<string>();

  let hasMoved = true;
  while (hasMoved) {
    hasMoved = false;
    for (let i = 0; i < N; i++) {
       const u = finalUsers[i];
       if (movedUserIds.has(u.id)) continue;
       
       const theoreticalLevel = Math.ceil(((i + 1) * 10) / N);
       const dbLevel = u.lastCalculatedLevel;

       if (dbLevel !== null && dbLevel !== undefined && dbLevel !== 0) {
         const minLevelAllowed = Math.max(1, dbLevel - 3);
         const maxLevelAllowed = Math.min(10, dbLevel + 3);

         if (theoreticalLevel < minLevelAllowed) { 
           const targetPlace = Math.floor(((minLevelAllowed - 1) * N) / 10) + 1;
           const targetIndex = Math.min(N - 1, targetPlace - 1);
           if (targetIndex > i) {
             console.log(`[Move] ${u.name} (DB:${dbLevel}) moves DOWN: thLvl ${theoreticalLevel} -> idx ${targetIndex}`);
             finalUsers.splice(i, 1);
             finalUsers.splice(targetIndex, 0, u);
             movedUserIds.add(u.id);
             hasMoved = true;
             break; 
           }
         } 
         else if (theoreticalLevel > maxLevelAllowed) {
           const targetPlace = Math.max(1, Math.floor((maxLevelAllowed * N) / 10)); 
           const targetIndex = Math.max(0, targetPlace - 1);
           if (targetIndex < i) {
             console.log(`[Move] ${u.name} (DB:${dbLevel}) moves UP: thLvl ${theoreticalLevel} -> idx ${targetIndex}`);
             finalUsers.splice(i, 1);
             finalUsers.splice(targetIndex, 0, u);
             movedUserIds.add(u.id);
             hasMoved = true;
             break;
           }
         }
       }
    }
  }

  finalUsers.forEach((u, i) => {
     if(u.name.includes('Lucien')) console.log(`[Trace] Lucien ended at Index: ${i}`);
  });
}

checkRealTrace().finally(() => prisma.$disconnect());
