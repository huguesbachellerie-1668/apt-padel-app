'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import { getSessionUser } from "@/lib/auth"

export async function archiveSeason() {
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true }
  });

  if (!activeSeason) return;

  const users = await prisma.user.findMany();
  
  // Find the season winner
  let winner = null;
  for (const user of users) {
    if (user.totalMatches >= 30) {
      if (!winner || user.averagePoints > winner.averagePoints) {
        winner = user;
      }
    }
  }

  for (const user of users) {
    const historicalStats = user.historicalStats ? (typeof user.historicalStats === 'object' ? { ...user.historicalStats } : JSON.parse(user.historicalStats as string)) : {};
    
    if (user.totalMatches >= 30) {
      // Check if this season was already archived for this user
      const isAlreadyArchived = historicalStats[activeSeason.name] !== undefined;
      
      historicalStats[activeSeason.name] = user.averagePoints || 0;
      
      const updateData: Prisma.UserUpdateInput = { historicalStats };
      if (winner && user.id === winner.id && !isAlreadyArchived) {
         updateData.stars = { increment: 1 };
      }
      
      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });
    }
  }
  revalidatePath('/admin');
  revalidatePath('/');
  redirect('/admin?success=archived');
}

export async function createSeason(formData: FormData) {
  const name = formData.get('name') as string;
  
  // Find current active season
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true }
  });

  if (activeSeason) {
    // Remettre à zéro les compteurs pour la nouvelle saison
    const users = await prisma.user.findMany();
    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          points: 0,
          totalMatches: 0,
          tops: 0,
          flops: 0
        }
      });
    }

    // Désactive l'ancienne saison
    await prisma.season.update({
      where: { id: activeSeason.id },
      data: { isActive: false }
    });
  }

  // Création de la nouvelle saison
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
  const isTournament = formData.get('isTournament') === 'true';
  
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
      courts,
      isTournament
    }
  });
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function toggleSessionTournamentAction(sessionId: string, isTournament: boolean) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { isTournament }
  });
  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath(`/session/${sessionId}`);
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

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return;

  const isTournament = formData.get('isTournament') !== null
    ? formData.get('isTournament') === 'true'
    : Boolean(session.isTournament);

  const registrations = await prisma.registration.findMany({
    where: { sessionId },
    include: { user: true },
    orderBy: { createdAt: 'asc' }
  });

  const totalPossiblePools = Math.floor(registrations.length / 4);
  const actualPoolsCount = isTournament
    ? Math.min(totalPossiblePools, courtsCount, 10)
    : Math.min(totalPossiblePools, courtsCount);

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
    lastSession.pools.forEach(p => p.players.forEach(pp => lastSessionUserIds.add(pp.userId)));
  }

  // --- Step 8: Tri des sélectionnés
  const sortedRegs = [...registrations].sort((a, b) => {
    const aLast = lastSessionUserIds.has(a.userId) ? 1 : 0;
    const bLast = lastSessionUserIds.has(b.userId) ? 1 : 0;
    if (aLast !== bLast) return bLast - aLast;

    const aHistStats = a.user.historicalStats ? (typeof a.user.historicalStats === 'object' ? a.user.historicalStats : JSON.parse(a.user.historicalStats as string)) : {};
    const bHistStats = b.user.historicalStats ? (typeof b.user.historicalStats === 'object' ? b.user.historicalStats : JSON.parse(b.user.historicalStats as string)) : {};

    const aMem = ((a.user.totalMatches && a.user.totalMatches > 0) || Object.keys(aHistStats).length > 0) ? 1 : 0;
    const bMem = ((b.user.totalMatches && b.user.totalMatches > 0) || Object.keys(bHistStats).length > 0) ? 1 : 0;
    if (aMem !== bMem) return bMem - aMem;

    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const selectedRegistrations = sortedRegs.slice(0, maxPlayers);
  const N = maxPlayers;

  // --- Tri par points généraux (Initial Point Seed)
  const electedUsers = selectedRegistrations.map(r => r.user).sort((a, b) => b.averagePoints - a.averagePoints);
  const userToReg = new Map(selectedRegistrations.map(r => [r.userId, r]));

  // --- Clear previous pools
  const poolsToDelete = await prisma.pool.findMany({ where: { sessionId } });
  const poolIds = poolsToDelete.map(p => p.id);
  if (poolIds.length > 0) {
    await prisma.match.deleteMany({ where: { poolId: { in: poolIds } } });
    await prisma.poolPlayer.deleteMany({ where: { poolId: { in: poolIds } } });
    await prisma.pool.deleteMany({ where: { sessionId } });
  }

  // --- Step 11: Top-Down Cascade & Pool Plafond
  // Compute natural positions for injury logic
  const naturalLevelMap = new Map<string, number>();
  const naturalPoolMap = new Map<string, number>();
  electedUsers.forEach((u, i) => {
    naturalLevelMap.set(u.id, Math.ceil(((i + 1) * 10) / N));
    naturalPoolMap.set(u.id, Math.floor(i / 4) + 1);
  });

  const finalUsers = [...electedUsers];

  // Fetch last pool level for all elected users
  const userLastPoolMap = new Map<string, number>();
  const pastPoolPlayers = await prisma.poolPlayer.findMany({
    where: {
      userId: { in: electedUsers.map(u => u.id) },
      pool: { session: { status: 'TERMINEE' } }
    },
    include: { pool: { include: { session: true } } },
    orderBy: { pool: { session: { date: 'desc' } } }
  });
  
  for (const pp of pastPoolPlayers) {
     if (!userLastPoolMap.has(pp.userId)) {
         userLastPoolMap.set(pp.userId, pp.pool.level);
     }
  }

  // --- Initial Injury Shift
  for (const u of [...finalUsers]) {
     const reg = userToReg.get(u.id);
     if (reg && reg.isReturningFromInjury) {
        const idx = finalUsers.findIndex(fu => fu.id === u.id);
        const target = Math.min(finalUsers.length - 1, idx + 4);
        const [rem] = finalUsers.splice(idx, 1);
        finalUsers.splice(target, 0, rem);
     }
  }

  if (actualPoolsCount < 8) {
      let hasMoved = true;
      let iterations = 0;
      const MAX_ITERATIONS = 100;
      const injuryOffset = Math.ceil(10 / actualPoolsCount);

      while (hasMoved && iterations < MAX_ITERATIONS) {
        hasMoved = false;
        iterations++;

        for (let i = 0; i < N; i++) {
           const u = finalUsers[i];
           
           const theoreticalLevel = Math.ceil(((i + 1) * 10) / N);
           const dbLevel = u.lastCalculatedLevel;

           if (dbLevel !== null && dbLevel !== undefined && dbLevel !== 0) {
             const isInj = userToReg.get(u.id)?.isReturningFromInjury;
             const injOff = isInj ? injuryOffset : 0;
             const baseMin = Math.max(1, dbLevel - 3);
             let minLevelAllowed = baseMin + injOff;
             if (isInj) {
               const natLvl = naturalLevelMap.get(u.id) || 1;
               minLevelAllowed = Math.max(minLevelAllowed, natLvl + injOff);
             }
             const maxLevelAllowed = Math.min(10, dbLevel + 3) + injOff;

             if (theoreticalLevel < minLevelAllowed) { // Trop haut -> doit descendre
               let target = -1;
               for (let j = i + 1; j < N; j++) {
                   const uJ = finalUsers[j];
                   const dbLvlJ = uJ.lastCalculatedLevel;
                   const isInjJ = userToReg.get(uJ.id)?.isReturningFromInjury;
                   const injOffJ = isInjJ ? injuryOffset : 0;
                   const baseMinJ = (dbLvlJ !== null && dbLvlJ !== undefined && dbLvlJ !== 0) ? Math.max(1, dbLvlJ - 3) : 1;
                   let minJ = baseMinJ + injOffJ;
                   if (isInjJ) {
                     const natLvlJ = naturalLevelMap.get(uJ.id) || 1;
                     minJ = Math.max(minJ, natLvlJ + injOffJ);
                   }
                   const maxJ = (dbLvlJ !== null && dbLvlJ !== undefined && dbLvlJ !== 0) ? Math.min(10, dbLvlJ + 3) + injOffJ : 10;
                   const newLevelForJ = Math.ceil(((i + 1) * 10) / N);
                   if (minJ <= newLevelForJ && maxJ >= newLevelForJ) {
                       target = j;
                       break;
                   }
               }
               if (target !== -1) {
                 const [shiftedUser] = finalUsers.splice(target, 1);
                 finalUsers.splice(i, 0, shiftedUser);
                 hasMoved = true;
                 break; 
               }
             } 
             else if (theoreticalLevel > maxLevelAllowed) { // Trop bas -> doit monter
               let target = -1;
               for (let j = i - 1; j >= 0; j--) {
                   const uJ = finalUsers[j];
                   const dbLvlJ = uJ.lastCalculatedLevel;
                   const isInjJ = userToReg.get(uJ.id)?.isReturningFromInjury;
                   const injOffJ = isInjJ ? injuryOffset : 0;
                   const baseMinJ = (dbLvlJ !== null && dbLvlJ !== undefined && dbLvlJ !== 0) ? Math.max(1, dbLvlJ - 3) : 1;
                   let minJ = baseMinJ + injOffJ;
                   if (isInjJ) {
                     const natLvlJ = naturalLevelMap.get(uJ.id) || 1;
                     minJ = Math.max(minJ, natLvlJ + injOffJ);
                   }
                   const maxJ = (dbLvlJ !== null && dbLvlJ !== undefined && dbLvlJ !== 0) ? Math.min(10, dbLvlJ + 3) + injOffJ : 10;
                   const newLevelForJ = Math.ceil(((i + 1) * 10) / N);
                   if (minJ <= newLevelForJ && maxJ >= newLevelForJ) {
                       target = j;
                       break;
                   }
               }
               if (target !== -1) {
                 const [shiftedUser] = finalUsers.splice(target, 1);
                 finalUsers.splice(i, 0, shiftedUser);
                 hasMoved = true;
                 break;
               }
             }
           }
        }
      }

      if (iterations >= MAX_ITERATIONS) {
        console.warn("Max iterations reached in Top-Down Cascade (< 8 pools).");
      }
  } else {
      // >= 8 pools : Plafonnement forfaitaire +/- 3 poules
      let hasMoved = true;
      let iterations = 0;
      const MAX_ITERATIONS = 100;

      while (hasMoved && iterations < MAX_ITERATIONS) {
        hasMoved = false;
        iterations++;

        for (let i = 0; i < N; i++) {
           const u = finalUsers[i];
           const currentPool = Math.floor(i / 4) + 1; // 1-indexed
           const lastPool = userLastPoolMap.get(u.id);

           if (lastPool !== undefined) {
             const isInj = userToReg.get(u.id)?.isReturningFromInjury;
             const injOff = isInj ? 1 : 0;
             const baseMin = Math.max(1, lastPool - 3);
             let minPoolAllowed = baseMin + injOff;
             if (isInj) {
               const natPool = naturalPoolMap.get(u.id) || 1;
               minPoolAllowed = Math.max(minPoolAllowed, natPool + injOff);
             }
             const maxPoolAllowed = Math.min(actualPoolsCount, lastPool + 3) + injOff;

             if (currentPool < minPoolAllowed) { // Trop haut -> doit descendre
               let target = -1;
               for (let j = i + 1; j < N; j++) {
                   const uJ = finalUsers[j];
                   const lpJ = userLastPoolMap.get(uJ.id);
                   const isInjJ = userToReg.get(uJ.id)?.isReturningFromInjury;
                   const injOffJ = isInjJ ? 1 : 0;
                   const baseMinJ = lpJ !== undefined ? Math.max(1, lpJ - 3) : 1;
                   let minJ = baseMinJ + injOffJ;
                   if (isInjJ) {
                     const natPoolJ = naturalPoolMap.get(uJ.id) || 1;
                     minJ = Math.max(minJ, natPoolJ + injOffJ);
                   }
                   const maxJ = lpJ !== undefined ? Math.min(actualPoolsCount, lpJ + 3) + injOffJ : actualPoolsCount;
                   const newPoolForJ = Math.floor(i / 4) + 1;
                   if (minJ <= newPoolForJ && maxJ >= newPoolForJ) {
                       target = j;
                       break;
                   }
               }
               if (target !== -1) {
                 const [shiftedUser] = finalUsers.splice(target, 1);
                 finalUsers.splice(i, 0, shiftedUser);
                 hasMoved = true;
                 i--; 
               }
             } 
             else if (currentPool > maxPoolAllowed) { // Trop bas -> doit monter
               let target = -1;
               for (let j = i - 1; j >= 0; j--) {
                   const uJ = finalUsers[j];
                   const lpJ = userLastPoolMap.get(uJ.id);
                   const isInjJ = userToReg.get(uJ.id)?.isReturningFromInjury;
                   const injOffJ = isInjJ ? 1 : 0;
                   const baseMinJ = lpJ !== undefined ? Math.max(1, lpJ - 3) : 1;
                   let minJ = baseMinJ + injOffJ;
                   if (isInjJ) {
                     const natPoolJ = naturalPoolMap.get(uJ.id) || 1;
                     minJ = Math.max(minJ, natPoolJ + injOffJ);
                   }
                   const maxJ = lpJ !== undefined ? Math.min(actualPoolsCount, lpJ + 3) + injOffJ : actualPoolsCount;
                   const newPoolForJ = Math.floor(i / 4) + 1;
                   if (minJ <= newPoolForJ && maxJ >= newPoolForJ) {
                       target = j;
                       break;
                   }
               }
               if (target !== -1) {
                 const [shiftedUser] = finalUsers.splice(target, 1);
                 finalUsers.splice(i, 0, shiftedUser);
                 hasMoved = true;
                 break;
               }
             }
           }
        }
      }

      if (iterations >= MAX_ITERATIONS) {
        console.warn("Max iterations reached in Pool Plafond (>= 8 pools).");
      }
  }

  // --- Fetch Session Reservations for Auto-Assignment
  const sessionReservations = await prisma.courtReservation.findMany({
    where: { sessionId }
  });

  // --- Save to DB
  const createdPools: { pool: { id: string; level: number }; poolUsers: typeof finalUsers }[] = [];

  for (let level = 1; level <= actualPoolsCount; level++) {
    const poolUsers = finalUsers.slice((level - 1) * 4, level * 4);
    
    // Ultime étape : classer les joueurs par points dans chaque poule (du plus grand au plus petit)
    poolUsers.sort((a, b) => b.averagePoints - a.averagePoints);
    
    const matchingRes = sessionReservations.find(r => r.defaultPoolLevel === level);
    
    const pool = await prisma.pool.create({
      data: { 
        sessionId, 
        courtNumber: level, 
        level: level,
        courtReservationId: matchingRes ? matchingRes.id : null
      }
    });

    await Promise.all(poolUsers.map(async (u, idx: number) => {
      return prisma.poolPlayer.create({
        data: { poolId: pool.id, userId: u.id, seed: idx + 1 }
      });
    }));

    createdPools.push({ pool, poolUsers });
  }

  if (!isTournament) {
    for (const { pool, poolUsers: pU } of createdPools) {
      await prisma.match.create({ data: { poolId: pool.id, order: 1, team1Player1Id: pU[0].id, team1Player2Id: pU[3].id, team2Player1Id: pU[1].id, team2Player2Id: pU[2].id } });
      await prisma.match.create({ data: { poolId: pool.id, order: 2, team1Player1Id: pU[0].id, team1Player2Id: pU[2].id, team2Player1Id: pU[1].id, team2Player2Id: pU[3].id } });
      await prisma.match.create({ data: { poolId: pool.id, order: 3, team1Player1Id: pU[0].id, team1Player2Id: pU[1].id, team2Player1Id: pU[2].id, team2Player2Id: pU[3].id } });
    }
  } else {
    // Mode Tournoi : Poules couplées 2 par 2 avec paires fixes
    const pairsCount = Math.floor(createdPools.length / 2);
    for (let k = 0; k < pairsCount; k++) {
      const { pool: poolA, poolUsers: pA } = createdPools[2 * k];
      const { pool: poolB, poolUsers: pB } = createdPools[2 * k + 1];

      // 4 Équipes fixes croisées :
      // Éq.1: #1 Poule A (pA[0]) + #4 Poule B (pB[3])
      // Éq.2: #2 Poule A (pA[1]) + #3 Poule B (pB[2])
      // Éq.3: #3 Poule A (pA[2]) + #2 Poule B (pB[1])
      // Éq.4: #4 Poule A (pA[3]) + #1 Poule B (pB[0])
      const eq1 = { p1: pA[0].id, p2: pB[3].id };
      const eq2 = { p1: pA[1].id, p2: pB[2].id };
      const eq3 = { p1: pA[2].id, p2: pB[1].id };
      const eq4 = { p1: pA[3].id, p2: pB[0].id };

      // Terrain impair (poolA) :
      // Rotation 1 : Éq.1 vs Éq.2
      await prisma.match.create({ data: { poolId: poolA.id, order: 1, team1Player1Id: eq1.p1, team1Player2Id: eq1.p2, team2Player1Id: eq2.p1, team2Player2Id: eq2.p2 } });
      // Rotation 2 : Éq.1 vs Éq.3
      await prisma.match.create({ data: { poolId: poolA.id, order: 2, team1Player1Id: eq1.p1, team1Player2Id: eq1.p2, team2Player1Id: eq3.p1, team2Player2Id: eq3.p2 } });
      // Rotation 3 : Éq.1 vs Éq.4
      await prisma.match.create({ data: { poolId: poolA.id, order: 3, team1Player1Id: eq1.p1, team1Player2Id: eq1.p2, team2Player1Id: eq4.p1, team2Player2Id: eq4.p2 } });

      // Terrain pair (poolB) :
      // Rotation 1 : Éq.3 vs Éq.4
      await prisma.match.create({ data: { poolId: poolB.id, order: 1, team1Player1Id: eq3.p1, team1Player2Id: eq3.p2, team2Player1Id: eq4.p1, team2Player2Id: eq4.p2 } });
      // Rotation 2 : Éq.2 vs Éq.4
      await prisma.match.create({ data: { poolId: poolB.id, order: 2, team1Player1Id: eq2.p1, team1Player2Id: eq2.p2, team2Player1Id: eq4.p1, team2Player2Id: eq4.p2 } });
      // Rotation 3 : Éq.2 vs Éq.3
      await prisma.match.create({ data: { poolId: poolB.id, order: 3, team1Player1Id: eq2.p1, team1Player2Id: eq2.p2, team2Player1Id: eq3.p1, team2Player2Id: eq3.p2 } });
    }

    // Option A : Si nombre impair de poules, la dernière poule isolée joue en format classique
    if (createdPools.length % 2 === 1) {
      const { pool: orphanPool, poolUsers: pU } = createdPools[createdPools.length - 1];
      await prisma.match.create({ data: { poolId: orphanPool.id, order: 1, team1Player1Id: pU[0].id, team1Player2Id: pU[3].id, team2Player1Id: pU[1].id, team2Player2Id: pU[2].id } });
      await prisma.match.create({ data: { poolId: orphanPool.id, order: 2, team1Player1Id: pU[0].id, team1Player2Id: pU[2].id, team2Player1Id: pU[1].id, team2Player2Id: pU[3].id } });
      await prisma.match.create({ data: { poolId: orphanPool.id, order: 3, team1Player1Id: pU[0].id, team1Player2Id: pU[1].id, team2Player1Id: pU[2].id, team2Player2Id: pU[3].id } });
    }
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'POULES_GENEREES', courts: actualPoolsCount, isTournament }
  });

  await prisma.activityLog.create({
    data: { sessionId, message: `Admin - Génération des poules ${isTournament ? 'Mode Tournoi ' : ''}(x${actualPoolsCount})` }
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

  await prisma.activityLog.create({
    data: { sessionId, message: 'Admin - Annulation complète des poules' }
  });

  revalidatePath('/admin');
  revalidatePath('/');
}

export async function deleteSession(sessionId: string) {
  const poolsToDelete = await prisma.pool.findMany({ where: { sessionId } });
  const poolIds = poolsToDelete.map(p => p.id);
  
  if (poolIds.length > 0) {
    await prisma.match.deleteMany({ where: { poolId: { in: poolIds } } });
    await prisma.poolPlayer.deleteMany({ where: { poolId: { in: poolIds } } });
    await prisma.pool.deleteMany({ where: { sessionId } });
  }

  await prisma.registration.deleteMany({ where: { sessionId } });
  await prisma.courtReservation.deleteMany({ where: { sessionId } });
  // activityLog est en Cascade, mais au cas où :
  await prisma.activityLog.deleteMany({ where: { sessionId } });

  await prisma.session.delete({ where: { id: sessionId } });

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

export async function finishSessionAndCalculatePoints(sessionId: string, formData?: FormData) {
  const countPoints = formData ? formData.get('countPoints') !== null : true;

  await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'TERMINEE', isCounted: countPoints }
  });

  // Nettoyage des logs pour ne pas surcharger la BDD
  await prisma.activityLog.deleteMany({
    where: { sessionId }
  });

  if (countPoints) {
    const pools = await prisma.pool.findMany({
    where: { sessionId },
    include: {
      players: { include: { user: true } },
      matches: true
    }
  });

  const N = pools.length * 4;
  const allSessionMatches = pools.flatMap(p => p.matches);

  for (const pool of pools) {
    for (const poolPlayer of pool.players) {
      const placeInSession = ((pool.level - 1) * 4) + poolPlayer.seed;
      const thLevel = Math.ceil((placeInSession * 10) / N);

      let sessionPoints = 0;
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let validMatches = 0;

      for (const match of allSessionMatches) {
        const isTeam1 = match.team1Player1Id === poolPlayer.userId || match.team1Player2Id === poolPlayer.userId;
        const isTeam2 = match.team2Player1Id === poolPlayer.userId || match.team2Player2Id === poolPlayer.userId;

        if (!isTeam1 && !isTeam2) continue;

        const myGames = isTeam1 ? match.team1Games : match.team2Games;
        const theirGames = isTeam1 ? match.team2Games : match.team1Games;

        if (myGames === null || theirGames === null) continue;

        // Match annulé pour cause de forfait/blessure (0-0)
        if (myGames === 0 && theirGames === 0) continue;

        validMatches++;
        sessionPoints += myGames;

        if (myGames > theirGames) {
          sessionPoints += 30; wins++;
        } else if (myGames === theirGames) {
          sessionPoints += 20; draws++;
        } else {
          sessionPoints += 10; losses++;
        }
      }

      // Un TOP ou FLOP n'est possible QUE si les 3 matchs ont été joués validement
      const isTop = validMatches === 3 && (wins === 3 || (wins === 2 && draws === 1));
      const isFlop = validMatches === 3 && losses === 3;

      const user = poolPlayer.user;
      const sessionAverage = sessionPoints / 3;
      const newTotalPoints = (user.points || 0) + sessionAverage;
      const newMatchesPlayed = (user.totalMatches || 0) + validMatches;
      const realSessionsPlayed = newMatchesPlayed / 3;

      let newAverage = 0;
      if (realSessionsPlayed > 0) {
        if (realSessionsPlayed < 4) {
          // Lissage inter-saison (Bouclier de classement)
          let ghostAverage = 0;
          const histStats = user.historicalStats ? (typeof user.historicalStats === 'object' ? user.historicalStats : JSON.parse(user.historicalStats as string)) : {};
          const keys = Object.keys(histStats).sort();
          if (keys.length > 0) {
            const lastStat = histStats[keys[keys.length - 1]];
            if (typeof lastStat === 'object' && lastStat !== null && 'averagePoints' in lastStat) {
              ghostAverage = Number(lastStat.averagePoints) || 0;
            } else {
              ghostAverage = Number(lastStat) || 0;
            }
          }
          if (ghostAverage > 0) {
            newAverage = (ghostAverage + newTotalPoints) / (1 + realSessionsPlayed);
          } else {
            newAverage = newTotalPoints / realSessionsPlayed;
          }
        } else {
          // A partir de la 4ème vraie session, la moyenne historique est abandonnée
          newAverage = newTotalPoints / realSessionsPlayed;
        }
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          points: newTotalPoints,
          totalMatches: newMatchesPlayed,
          averagePoints: newAverage,
          tops: isTop ? (user.tops || 0) + 1 : user.tops,
          flops: isFlop ? (user.flops || 0) + 1 : user.flops,
          lastCalculatedLevel: thLevel
        }
      });
    }
  }
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/ranking');
  revalidatePath('/history');
  revalidatePath('/history');
}

export async function updateGlobalSettings(formData: FormData) {
  const durationStr = formData.get('matchDuration') as string;
  const duration = parseInt(durationStr, 10);
  
  const lockUnregisterDayStr = formData.get('lockUnregisterDay') as string;
  const lockUnregisterDay = parseInt(lockUnregisterDayStr, 10);
  
  const lockUnregisterTime = formData.get('lockUnregisterTime') as string;

  const dataToUpdate: Prisma.SettingsUpdateInput = {};
  if (!isNaN(duration) && duration > 0 && duration <= 120) {
    dataToUpdate.matchDuration = duration;
  }
  if (!isNaN(lockUnregisterDay)) {
    dataToUpdate.lockUnregisterDay = lockUnregisterDay;
  }
  if (lockUnregisterTime) {
    dataToUpdate.lockUnregisterTime = lockUnregisterTime;
  }

  if (Object.keys(dataToUpdate).length > 0) {
     await prisma.settings.upsert({
        where: { id: 'global' },
        update: dataToUpdate,
        create: { id: 'global', ...(dataToUpdate as Prisma.SettingsCreateInput) }
     });
  }

  revalidatePath('/admin');
  revalidatePath('/');
}

// --- Gestion des terrains / Réservations (déplacé de Session Detail -> Admin) ---

async function syncSessionStartTimeWithReservations(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { reservations: true }
  });
  if (!session || session.reservations.length === 0) return;

  const sortedTimes = session.reservations
    .map(r => r.startTime)
    .filter(Boolean)
    .sort();

  if (sortedTimes.length === 0) return;

  const [hoursStr, minutesStr] = sortedTimes[0].split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (isNaN(hours) || isNaN(minutes)) return;

  const updatedDate = new Date(session.date);
  updatedDate.setHours(hours, minutes, 0, 0);

  await prisma.session.update({
    where: { id: sessionId },
    data: { date: updatedDate }
  });
}

export async function createCourtReservation(sessionId: string, formData: FormData) {
  const currUser = await getSessionUser();
  if (!currUser || !['PRESIDENT', 'ORGA', 'TRESORIER'].includes(currUser.role)) throw new Error("Unauthorized");

  const clubId = formData.get('clubId') as string;
  const name = formData.get('name') as string;
  const startTime = formData.get('startTime') as string;

  if (!clubId || !name || !startTime) return;

  await prisma.courtReservation.create({
    data: {
      sessionId,
      clubId,
      name,
      startTime,
      defaultPoolLevel: null
    }
  });

  await syncSessionStartTimeWithReservations(sessionId);

  revalidatePath(`/`);
  revalidatePath(`/admin`);
  revalidatePath(`/session/${sessionId}`);
}

export async function updateReservationDefaultLevel(reservationId: string, formData: FormData) {
  const currUser = await getSessionUser();
  if (!currUser || !['PRESIDENT', 'ORGA', 'TRESORIER'].includes(currUser.role)) throw new Error("Unauthorized");

  const poolLvlStr = formData.get('defaultPoolLevel') as string;
  const targetLevel = poolLvlStr ? parseInt(poolLvlStr, 10) : null;

  await prisma.courtReservation.update({
    where: { id: reservationId },
    data: {
      defaultPoolLevel: isNaN(targetLevel as number) ? null : targetLevel
    }
  });

  revalidatePath(`/admin`);
}

export async function deleteCourtReservation(sessionId: string, formData: FormData) {
  const currUser = await getSessionUser();
  if (!currUser || !['PRESIDENT', 'ORGA', 'TRESORIER'].includes(currUser.role)) throw new Error("Unauthorized");
  
  const reservationId = formData.get('reservationId') as string;
  if (!reservationId) return;

  // Unlink from pool if any (Set courtReservationId to null)
  await prisma.pool.updateMany({
    where: { courtReservationId: reservationId },
    data: { courtReservationId: null }
  });

  await prisma.courtReservation.delete({
    where: { id: reservationId }
  });

  await syncSessionStartTimeWithReservations(sessionId);

  revalidatePath(`/`);
  revalidatePath(`/admin`);
  revalidatePath(`/session/${sessionId}`);
}
