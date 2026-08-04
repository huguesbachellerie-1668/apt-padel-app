import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const allUsers = await prisma.user.findMany({
    select: { id: true, points: true, totalMatches: true, nickname: true, name: true }
  });

  const allSessions = await prisma.session.findMany({
    where: { status: 'TERMINEE' },
    orderBy: { date: 'asc' },
    include: {
      pools: {
        include: {
          matches: true
        }
      }
    }
  });

  const userStats = new Map();
  for (const u of allUsers) {
    userStats.set(u.id, { 
       user: u,
       currentPoints: u.points || 0, 
       currentMatches: u.totalMatches || 0,
       dbPoints: 0,
       dbMatches: 0
    });
  }

  // 1. Calculate dbPoints (points earned in recorded sessions)
  for (const session of allSessions) {
     for (const pool of session.pools) {
        for (const match of pool.matches) {
           const team1Ids = [match.team1Player1Id, match.team1Player2Id].filter(Boolean);
           const team2Ids = [match.team2Player1Id, match.team2Player2Id].filter(Boolean);
           
           if (match.team1Games !== null && match.team2Games !== null) {
               for (const uid of team1Ids) {
                   const st = userStats.get(uid);
                   if (st) {
                       st.dbMatches++;
                       st.dbPoints += match.team1Games;
                       if (match.team1Games > match.team2Games) st.dbPoints += 30;
                       else if (match.team1Games === match.team2Games) st.dbPoints += 20;
                       else st.dbPoints += 10;
                   }
               }
               for (const uid of team2Ids) {
                   const st = userStats.get(uid);
                   if (st) {
                       st.dbMatches++;
                       st.dbPoints += match.team2Games;
                       if (match.team2Games > match.team1Games) st.dbPoints += 30;
                       else if (match.team2Games === match.team1Games) st.dbPoints += 20;
                       else st.dbPoints += 10;
                   }
               }
           }
        }
     }
  }

  // 2. Set starting points
  for (const [uid, stats] of userStats.entries()) {
     // DB Points are calculated per match. But "points" in user is session-based.
     // So dbPoints / 3 = session equivalent points!
     const sessionDbPoints = stats.dbPoints / 3;
     
     stats.startPoints = Math.max(0, stats.currentPoints - sessionDbPoints);
     stats.startSessions = Math.max(0, Math.floor(stats.currentMatches / 3) - Math.floor(stats.dbMatches / 3));
     
     stats.trackingPoints = stats.startPoints;
     stats.trackingSessions = stats.startSessions;
     stats.trackingAverage = stats.trackingSessions > 0 ? stats.trackingPoints / stats.trackingSessions : 0;
  }

  // Starting Rank
  let sortedUsers = Array.from(userStats.values()).sort((a, b) => b.trackingAverage - a.trackingAverage);
  
  const targetNickname = 'JP';
  let targetId = allUsers.find(u => u.nickname === targetNickname)?.id;
  
  if (targetId) {
     const startRank = sortedUsers.findIndex(u => u.user.id === targetId) + 1;
     console.log(`[Départ] ${targetNickname} Rank: ${startRank} (Avg: ${userStats.get(targetId).trackingAverage.toFixed(2)})`);
  }

  // 3. Replay and get rank
  for (const session of allSessions) {
     for (const pool of session.pools) {
        for (const match of pool.matches) {
           const team1Ids = [match.team1Player1Id, match.team1Player2Id].filter(Boolean);
           const team2Ids = [match.team2Player1Id, match.team2Player2Id].filter(Boolean);
           
           if (match.team1Games !== null && match.team2Games !== null) {
               for (const uid of team1Ids) {
                   const st = userStats.get(uid);
                   if (st) {
                       let pts = match.team1Games;
                       if (match.team1Games > match.team2Games) pts += 30;
                       else if (match.team1Games === match.team2Games) pts += 20;
                       else pts += 10;
                       st.trackingPoints += (pts / 3);
                   }
               }
               for (const uid of team2Ids) {
                   const st = userStats.get(uid);
                   if (st) {
                       let pts = match.team2Games;
                       if (match.team2Games > match.team1Games) pts += 30;
                       else if (match.team2Games === match.team1Games) pts += 20;
                       else pts += 10;
                       st.trackingPoints += (pts / 3);
                   }
               }
           }
        }
        
        // Add 1 session to everyone who played in this pool
        const poolPlayersIds = new Set();
        for (const match of pool.matches) {
           if (match.team1Player1Id) poolPlayersIds.add(match.team1Player1Id);
           if (match.team1Player2Id) poolPlayersIds.add(match.team1Player2Id);
           if (match.team2Player1Id) poolPlayersIds.add(match.team2Player1Id);
           if (match.team2Player2Id) poolPlayersIds.add(match.team2Player2Id);
        }
        for (const uid of poolPlayersIds) {
            const st = userStats.get(uid);
            if (st) st.trackingSessions++;
        }
     }
     
     for (const st of userStats.values()) {
         st.trackingAverage = st.trackingSessions > 0 ? st.trackingPoints / st.trackingSessions : 0;
     }
     
     sortedUsers = Array.from(userStats.values()).sort((a, b) => b.trackingAverage - a.trackingAverage);
     if (targetId) {
        const rank = sortedUsers.findIndex(u => u.user.id === targetId) + 1;
        const playedInSession = session.pools.some(p => p.matches.some(m => m.team1Player1Id === targetId || m.team1Player2Id === targetId || m.team2Player1Id === targetId || m.team2Player2Id === targetId));
        
        if (playedInSession) {
           console.log(`[${session.date.toLocaleDateString()}] Rank: ${rank} (Avg: ${userStats.get(targetId).trackingAverage.toFixed(2)})`);
        }
     }
  }
}

main().finally(() => prisma.$disconnect());
