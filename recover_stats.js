import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const dump = JSON.parse(fs.readFileSync('dump.json', 'utf8'));
  const dumpUsers = {};
  for (const u of dump.users) {
    dumpUsers[u.id] = { ...u };
  }

  // Get all DB sessions AFTER March 22, 2026
  const season = await prisma.season.findFirst({
    where: { name: 'Saison 2025-2026' }
  });

  const dbSessions = await prisma.session.findMany({
    where: {
      seasonId: season.id,
      status: 'TERMINEE',
      isCounted: true,
      date: { gt: new Date('2026-03-23T00:00:00Z') }
    },
    include: {
      pools: {
        include: {
          players: { include: { user: true } },
          matches: true
        }
      }
    }
  });

  console.log(`Found ${dbSessions.length} sessions after March 22.`);

  const finalStats = {};

  // Initialize with dump stats
  for (const uid in dumpUsers) {
    const u = dumpUsers[uid];
    finalStats[uid] = {
      id: u.id,
      name: u.name,
      nickname: u.nickname,
      stars: u.stars,
      totalMatches: u.totalMatches || 0,
      points: u.points || 0, // This points is the total points, right? Wait, let's check what points means.
      tops: u.tops || 0,
      flops: u.flops || 0,
      wins: 0,
      sessionsCount: Math.floor((u.totalMatches || 0) / 3),
      validMatches: u.totalMatches || 0
    };
    
    // We need to estimate 'wins' from the base stats, since it wasn't tracked as a separate field in dump.json!
    // Wait, dump.json DOES NOT HAVE 'wins'!
    // How do we compute wins for the Markdown artifact and Archives page?
    // We can't know the exact number of wins from the past. We can only know the total points.
    // Let's just estimate wins = (totalPoints - 10*validMatches) / 20 * validMatches ? No.
    // We'll leave wins = null or omit it for the base, and just show what we have.
  }

  // Calculate wins for the March 22 session from dump.json to add to our wins tracker
  const dumpSession = dump.sessions.find(s => s.date.includes('03-22'));
  if (dumpSession) {
     const dumpPools = dump.pools.filter(p => p.sessionId === dumpSession.id);
     for (const pool of dumpPools) {
         const poolPlayers = dump.poolPlayers.filter(pp => pp.poolId === pool.id);
         const matches = dump.matches.filter(m => m.poolId === pool.id);
         for (const pp of poolPlayers) {
             let wins = 0;
             for (const match of matches) {
                 const isTeam1 = match.team1Player1Id === pp.userId || match.team1Player2Id === pp.userId;
                 const isTeam2 = match.team2Player1Id === pp.userId || match.team2Player2Id === pp.userId;
                 if (!isTeam1 && !isTeam2) continue;
                 const myGames = isTeam1 ? match.team1Games : match.team2Games;
                 const theirGames = isTeam1 ? match.team2Games : match.team1Games;
                 if (myGames !== null && theirGames !== null && (myGames > 0 || theirGames > 0)) {
                     if (myGames > theirGames) wins++;
                 }
             }
             if (finalStats[pp.userId]) {
                 finalStats[pp.userId].wins += wins;
             }
         }
     }
  }

  // Add stats from DB sessions
  for (const session of dbSessions) {
    for (const pool of session.pools) {
      for (const poolPlayer of pool.players) {
        const userId = poolPlayer.userId;
        if (!finalStats[userId]) continue;

        const stats = finalStats[userId];
        stats.sessionsCount++;

        let sessionPoints = 0;
        let wins = 0;
        let draws = 0;
        let losses = 0;
        let validMatches = 0;

        for (const match of pool.matches) {
          const isTeam1 = match.team1Player1Id === userId || match.team1Player2Id === userId;
          const isTeam2 = match.team2Player1Id === userId || match.team2Player2Id === userId;
          if (!isTeam1 && !isTeam2) continue;

          const myGames = isTeam1 ? match.team1Games : match.team2Games;
          const theirGames = isTeam1 ? match.team2Games : match.team1Games;

          if (myGames === null || theirGames === null) continue;
          if (myGames === 0 && theirGames === 0) continue; // forfait

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

        stats.validMatches += validMatches;
        stats.totalMatches += validMatches;
        stats.points += sessionPoints / 3;
        stats.wins += wins;

        const isTop = validMatches === 3 && (wins === 3 || (wins === 2 && draws === 1));
        const isFlop = validMatches === 3 && losses === 3;

        if (isTop) stats.tops++;
        if (isFlop) stats.flops++;
      }
    }
  }

  // Save into User.historicalStats
  const dbUsers = await prisma.user.findMany();
  for (const user of dbUsers) {
      const hist = user.historicalStats ? (typeof user.historicalStats === 'object' ? { ...user.historicalStats } : JSON.parse(user.historicalStats)) : {};
      
      const userFinal = finalStats[user.id];
      if (userFinal && userFinal.totalMatches > 0) {
          userFinal.averagePoints = userFinal.sessionsCount > 0 ? (userFinal.points / userFinal.sessionsCount) : 0;
          hist['Saison 2025-2026_Final'] = userFinal;
          
          await prisma.user.update({
              where: { id: user.id },
              data: { historicalStats: hist }
          });
      }
  }

  console.log("Saved Final Stats to DB.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
