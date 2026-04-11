'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createSeason(formData: FormData) {
  const name = formData.get('name') as string;
  await prisma.season.create({
    data: {
      name,
      startDate: new Date(),
      isActive: true
    }
  });
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function createSession(formData: FormData) {
  const datePart = formData.get('date_part') as string;
  const timePart = formData.get('time_part') as string;
  const dateStr = `${datePart}T${timePart}`;
  const seasonId = formData.get('seasonId') as string;
  const courts = parseInt(formData.get('courts') as string) || 0;
  
  const targetDate = new Date(dateStr);
  
  // Set time boundaries for the current day
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Check if a session already exists on this day
  const existingSession = await prisma.session.findFirst({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });

  if (existingSession) {
    throw new Error("Impossible de créer la session : une session existe déjà pour cette date. Vous ne pouvez pas avoir deux sessions le même jour.");
  }

  await prisma.session.create({
    data: {
      seasonId,
      date: targetDate,
      status: 'PREVUE',
      courts
    }
  });
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function updateSessionStatus(sessionId: string, status: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { status }
  });
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function generatePools(formData: FormData) {
  const sessionId = formData.get('sessionId') as string;
  const courtsStr = formData.get('courtsCount') as string;
  const courtsCount = parseInt(courtsStr, 10) || 0;

  if (courtsCount < 1) return;

  const registrations = await prisma.registration.findMany({
    where: { sessionId },
    include: { user: true },
    orderBy: { createdAt: 'asc' }
  });

  const totalPossiblePools = Math.floor(registrations.length / 4);
  const actualPoolsCount = Math.min(totalPossiblePools, courtsCount);

  if (actualPoolsCount < 1) return;

  const maxPlayers = actualPoolsCount * 4;
  // --- Priorité 1: Ont joué la session précédente
  const lastSession = await prisma.session.findFirst({
    where: { status: 'TERMINEE' },
    orderBy: { date: 'desc' },
    include: { pools: { include: { players: true } } }
  });
  const lastSessionUserIds = new Set<string>();
  if (lastSession) {
    lastSession.pools.forEach((p: any) => p.players.forEach((pp: any) => lastSessionUserIds.add(pp.userId)));
  }

  // --- Step 8: Tri des sélectionnés
  const sortedRegs = [...registrations].sort((a, b) => {
    const aLast = lastSessionUserIds.has(a.userId) ? 1 : 0;
    const bLast = lastSessionUserIds.has(b.userId) ? 1 : 0;
    if (aLast !== bLast) return bLast - aLast;

    const aMem = (a.user.totalMatches && a.user.totalMatches > 0) ? 1 : 0;
    const bMem = (b.user.totalMatches && b.user.totalMatches > 0) ? 1 : 0;
    if (aMem !== bMem) return bMem - aMem;

    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const selectedRegistrations = sortedRegs.slice(0, maxPlayers);
  const N = maxPlayers;

  // --- Tri par points généraux (Initial Point Seed)
  const electedUsers = selectedRegistrations.map((r: any) => r.user).sort((a: any, b: any) => b.points - a.points);
  const userToReg = new Map(selectedRegistrations.map(r => [r.userId, r]));

  // --- Clear previous pools
  const poolsToDelete = await prisma.pool.findMany({ where: { sessionId } });
  const poolIds = poolsToDelete.map(p => p.id);
  if (poolIds.length > 0) {
    await prisma.match.deleteMany({ where: { poolId: { in: poolIds } } });
    await prisma.poolPlayer.deleteMany({ where: { poolId: { in: poolIds } } });
    await prisma.pool.deleteMany({ where: { sessionId } });
  }

  // --- Step 11: Top-Down Cascade
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

         if (theoreticalLevel < minLevelAllowed) { // Trop haut -> doit descendre
           const targetPlace = Math.floor(((minLevelAllowed - 1) * N) / 10) + 1;
           const targetIndex = Math.min(N - 1, targetPlace - 1);
           if (targetIndex > i) {
             finalUsers.splice(i, 1);
             finalUsers.splice(targetIndex, 0, u);
             movedUserIds.add(u.id);
             hasMoved = true;
             break; 
           }
         } 
         else if (theoreticalLevel > maxLevelAllowed) { // Trop bas -> doit monter
           const targetPlace = Math.max(1, Math.floor((maxLevelAllowed * N) / 10)); // Pire place pour le maxLevel autorisé
           const targetIndex = Math.max(0, targetPlace - 1);
           if (targetIndex < i) {
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

  // --- Injury logic (Retour Blessure)
  for (const u of [...finalUsers]) {
     const reg = userToReg.get(u.id);
     if (reg && reg.isReturningFromInjury) {
        const currentIndex = finalUsers.findIndex(fu => fu.id === u.id);
        if (currentIndex === -1) continue;
        const currentPool = Math.floor(currentIndex / 4);
        if (currentPool < actualPoolsCount - 1) {
           const targetPool = currentPool + 1;
           let targetIndex = targetPool * 4;
           
           while (targetIndex < finalUsers.length) {
              const occUser = finalUsers[targetIndex];
              const occDbLvl = occUser.lastCalculatedLevel;
              if (occDbLvl !== null && occDbLvl !== undefined && occDbLvl !== 0) {
                  const occMaxLvl = Math.min(10, occDbLvl + 3);
                  const occThLvlIfPushed = Math.ceil(((targetIndex + 2) * 10) / N); 
                  if (occThLvlIfPushed > occMaxLvl) {
                     targetIndex++; // Le joueur est plafonné, on cherche la place d'après
                     continue;
                  }
              }
              break; 
           }
           if (targetIndex < finalUsers.length) {
              const removedUser = finalUsers.splice(currentIndex, 1)[0];
              finalUsers.splice(targetIndex - 1, 0, removedUser);
           }
        }
     }
  }

  // --- Save to DB
  for (let level = 1; level <= actualPoolsCount; level++) {
    const poolUsers = finalUsers.slice((level - 1) * 4, level * 4);
    
    const pool = await prisma.pool.create({
      data: { sessionId, courtNumber: level, level: level }
    });

    await Promise.all(poolUsers.map(async (u: any, idx: number) => {
      const placeInSession = ((level - 1) * 4) + idx + 1;
      const thLevel = Math.ceil((placeInSession * 10) / N);
      
      // Update DB Level
      await prisma.user.update({
        where: { id: u.id },
        data: { lastCalculatedLevel: thLevel }
      });

      return prisma.poolPlayer.create({
        data: { poolId: pool.id, userId: u.id, seed: idx + 1 }
      });
    }));

    const pU = poolUsers;
    await prisma.match.create({ data: { poolId: pool.id, order: 1, team1Player1Id: pU[0].id, team1Player2Id: pU[3].id, team2Player1Id: pU[1].id, team2Player2Id: pU[2].id } });
    await prisma.match.create({ data: { poolId: pool.id, order: 2, team1Player1Id: pU[0].id, team1Player2Id: pU[2].id, team2Player1Id: pU[1].id, team2Player2Id: pU[3].id } });
    await prisma.match.create({ data: { poolId: pool.id, order: 3, team1Player1Id: pU[0].id, team1Player2Id: pU[1].id, team2Player1Id: pU[2].id, team2Player2Id: pU[3].id } });
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'POULES_GENEREES', courts: actualPoolsCount }
  });

  revalidatePath('/admin');
  revalidatePath('/');
}

export async function reopenSession(sessionId: string) {
  const poolsToDelete = await prisma.pool.findMany({ where: { sessionId } });
  const poolIds = poolsToDelete.map(p => p.id);
  if (poolIds.length > 0) {
    await prisma.match.deleteMany({ where: { poolId: { in: poolIds } } });
    await prisma.poolPlayer.deleteMany({ where: { poolId: { in: poolIds } } });
    await prisma.pool.deleteMany({ where: { sessionId } });
  }
  
  await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'INSCRIPTIONS_OUVERTES' }
  });

  revalidatePath('/admin');
  revalidatePath('/');
}

export async function updateSessionCourtsAction(formData: FormData) {
  const sessionId = formData.get('sessionId') as string;
  const courts = parseInt(formData.get('courts') as string) || 1;

  await prisma.session.update({
    where: { id: sessionId },
    data: { courts }
  });
  
  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath(`/session/${sessionId}`);
}

export async function finishSessionAndCalculatePoints(sessionId: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'TERMINEE' }
  });

  const pools = await prisma.pool.findMany({
    where: { sessionId },
    include: {
      players: { include: { user: true } },
      matches: true
    }
  });

  for (const pool of pools) {
    for (const poolPlayer of pool.players) {
      let sessionPoints = 0;
      let wins = 0;
      let draws = 0;
      let losses = 0;

      for (const match of pool.matches) {
        const isTeam1 = match.team1Player1Id === poolPlayer.userId || match.team1Player2Id === poolPlayer.userId;
        const isTeam2 = match.team2Player1Id === poolPlayer.userId || match.team2Player2Id === poolPlayer.userId;

        if (!isTeam1 && !isTeam2) continue;

        const myGames = isTeam1 ? match.team1Games : match.team2Games;
        const theirGames = isTeam1 ? match.team2Games : match.team1Games;

        if (myGames === null || theirGames === null) continue;

        sessionPoints += myGames;

        if (myGames > theirGames) {
          sessionPoints += 30; wins++;
        } else if (myGames === theirGames) {
          sessionPoints += 20; draws++;
        } else {
          sessionPoints += 10; losses++;
        }
      }

      const isTop = wins === 3 || (wins === 2 && draws === 1);
      const isFlop = losses === 3;

      const user = poolPlayer.user;
      const sessionAverage = sessionPoints / 3;
      const newTotalPoints = (user.points || 0) + sessionAverage;
      const newMatchesPlayed = (user.totalMatches || 0) + 3;
      const newSessionsPlayed = newMatchesPlayed / 3;
      const newAverage = newSessionsPlayed > 0 ? (newTotalPoints / newSessionsPlayed) : 0;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          points: newTotalPoints,
          totalMatches: newMatchesPlayed,
          averagePoints: newAverage,
          tops: isTop ? (user.tops || 0) + 1 : user.tops,
          flops: isFlop ? (user.flops || 0) + 1 : user.flops
        }
      });
    }
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/ranking');
  revalidatePath('/history');
}
