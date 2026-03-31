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
  const dateStr = formData.get('date') as string;
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
  const selectedRegistrations = registrations.slice(0, maxPlayers);
  const selectedUsers = selectedRegistrations.map((r: any) => r.user).sort((a: any, b: any) => b.averagePoints - a.averagePoints);

  const poolsToDelete = await prisma.pool.findMany({ where: { sessionId } });
  const poolIds = poolsToDelete.map(p => p.id);
  if (poolIds.length > 0) {
    await prisma.match.deleteMany({ where: { poolId: { in: poolIds } } });
    await prisma.poolPlayer.deleteMany({ where: { poolId: { in: poolIds } } });
    await prisma.pool.deleteMany({ where: { sessionId } });
  }

  const maxMovement = actualPoolsCount <= 5 ? 2 : actualPoolsCount <= 9 ? 3 : 4;
  const userLastPools = new Map<string, number>();

  for (const user of selectedUsers) {
    const lastPoolPlayer = await prisma.poolPlayer.findFirst({
      where: { 
        userId: user.id,
        pool: { session: { status: 'TERMINEE' } }
      },
      orderBy: { pool: { session: { date: 'desc' } } },
      include: { pool: true }
    });
    if (lastPoolPlayer) {
      userLastPools.set(user.id, lastPoolPlayer.pool.level);
    }
  }

  let remainingPlayers = [...selectedUsers];
  const poolsData = [];

  for (let level = 1; level <= actualPoolsCount; level++) {
    const poolUsers: any[] = [];

    const mustPlaceHere = remainingPlayers.filter(p => {
      const lastLevel = userLastPools.get(p.id);
      if (lastLevel === undefined) return false;
      const allowedMax = Math.min(actualPoolsCount, lastLevel + maxMovement);
      return allowedMax === level; 
    });

    for (const p of mustPlaceHere) {
      if (poolUsers.length < 4) {
        poolUsers.push(p);
        remainingPlayers = remainingPlayers.filter(rp => rp.id !== p.id);
      }
    }

    for (const p of remainingPlayers) {
      if (poolUsers.length >= 4) break;
      const lastLevel = userLastPools.get(p.id);
      if (lastLevel !== undefined) {
         const allowedMin = Math.max(1, lastLevel - maxMovement);
         if (level < allowedMin) continue;
      }
      poolUsers.push(p);
    }
    remainingPlayers = remainingPlayers.filter(rp => !poolUsers.find(pp => pp.id === rp.id));

    if (poolUsers.length < 4) {
      for (const p of remainingPlayers) {
         if (poolUsers.length >= 4) break;
         poolUsers.push(p);
      }
      remainingPlayers = remainingPlayers.filter(rp => !poolUsers.find(pp => pp.id === rp.id));
    }

    poolsData.push({ level, players: poolUsers });
  }

  // --- Article 22: Injury Swap Logic ---
  const injuryRegistrations = registrations.filter(r => r.isReturningFromInjury);
  for (const reg of injuryRegistrations) {
    let playerPoolIndex = -1;
    let playerIndexInPool = -1;
    for (let i = 0; i < poolsData.length; i++) {
      const pIdx = poolsData[i].players.findIndex(p => p.id === reg.userId);
      if (pIdx !== -1) {
        playerPoolIndex = i;
        playerIndexInPool = pIdx;
        break;
      }
    }

    if (playerPoolIndex !== -1 && playerPoolIndex < poolsData.length - 1) {
      const targetPoolIndex = playerPoolIndex + 1;
      const playerToDrop = poolsData[playerPoolIndex].players[playerIndexInPool];
      const playerToRise = poolsData[targetPoolIndex].players[0]; 

      // Swap
      poolsData[playerPoolIndex].players[playerIndexInPool] = playerToRise;
      poolsData[targetPoolIndex].players[0] = playerToDrop;
      
      // Re-sort pools to keep competitive integrity (highest point = seed 1)
      poolsData[playerPoolIndex].players.sort((a,b) => b.averagePoints - a.averagePoints);
      poolsData[targetPoolIndex].players.sort((a,b) => b.averagePoints - a.averagePoints);
    }
  }

  // --- Save to DB ---
  for (const poolData of poolsData) {
    const pool = await prisma.pool.create({
      data: { sessionId, courtNumber: poolData.level, level: poolData.level }
    });

    await Promise.all(poolData.players.map((u: any, idx: number) =>
      prisma.poolPlayer.create({
        data: { poolId: pool.id, userId: u.id, seed: idx + 1 }
      })
    ));

    const pU = poolData.players;
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
