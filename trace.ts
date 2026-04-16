import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function traceGenerate() {
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

  const totalPossiblePools = Math.floor(registrations.length / 4);
  const actualPoolsCount = Math.min(totalPossiblePools, courtsCount);

  const maxPlayers = actualPoolsCount * 4;
  const lastSessionUserIds = new Set(); // mock for priority

  const sortedRegs = [...registrations].sort((a, b) => {
    // simplified priority for logging
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const selectedRegistrations = registrations; // Assuming all 36 selected
  const N = 36;

  console.log("Original Sorting (by points previously, now averagePoints):");
  const electedUsers = selectedRegistrations.map((r: any) => r.user).sort((a: any, b: any) => b.averagePoints - a.averagePoints);
  
  electedUsers.forEach((u, i) => {
     if(u.name.includes('Lucien')) console.log(`Lucien initial index: ${i}`);
  });

  const finalUsers = [...electedUsers];
  const movedUserIds = new Set<string>();

  let hasMoved = true;
  let loops = 0;
  while (hasMoved && loops < 50) {
    loops++;
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
             console.log(`${u.name} moves DOWN from ${i} to ${targetIndex} (dbLvl: ${dbLevel}, thLvl: ${theoreticalLevel}, minAllowed: ${minLevelAllowed})`);
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
             console.log(`${u.name} moves UP from ${i} to ${targetIndex} (dbLvl: ${dbLevel}, thLvl: ${theoreticalLevel}, maxAllowed: ${maxLevelAllowed}, avg: ${u.averagePoints})`);
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

  const finalLucienIndex = finalUsers.findIndex((u:any) => u.name.includes('Lucien'));
  console.log(`Lucien final cascade index: ${finalLucienIndex}`);
}

traceGenerate().finally(() => prisma.$disconnect());
