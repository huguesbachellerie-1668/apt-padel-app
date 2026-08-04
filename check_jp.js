import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function printChartData(nickname) {
  const users = await prisma.user.findMany({
    where: { nickname: { contains: nickname, mode: 'insensitive' } }
  });

  if (users.length === 0) {
      console.log(nickname, "not found");
      return;
  }
  const player = users[0];
  console.log("\n=== Player:", player.nickname, "===");

  const poolPlayers = await prisma.poolPlayer.findMany({
    where: { 
      userId: player.id,
      pool: { session: { status: 'TERMINEE' } }
    },
    include: {
      pool: {
        include: { session: true, matches: true }
      }
    },
    orderBy: { pool: { session: { date: 'desc' } } }
  });

  let dbPoints = 0;
  for (const pp of poolPlayers) {
    let sessionPoints = 0;
    for (const match of pp.pool.matches) {
      const isTeam1 = match.team1Player1Id === player.id || match.team1Player2Id === player.id;
      const isTeam2 = match.team2Player1Id === player.id || match.team2Player2Id === player.id;
      if (!isTeam1 && !isTeam2) continue;

      const myGames = isTeam1 ? match.team1Games : match.team2Games;
      const theirGames = isTeam1 ? match.team2Games : match.team1Games;
      if (myGames === null || theirGames === null) continue;

      sessionPoints += myGames;
      if (myGames > theirGames) sessionPoints += 30;
      else if (myGames === theirGames) sessionPoints += 20;
      else sessionPoints += 10;
    }
    dbPoints += (sessionPoints / 3);
  }

  const playerTotalSessions = Math.floor((player.totalMatches || 0) / 3);
  const dbSessionsCount = poolPlayers.length;
  const historicalSessions = Math.max(0, playerTotalSessions - dbSessionsCount);
  const historicalPoints = Math.max(0, (player.points || 0) - dbPoints);

  let cumulativePoints = historicalSessions > 0 ? historicalPoints : 0;
  let cumulativeSessions = historicalSessions;
  
  console.log("Historical Sessions:", historicalSessions, "Historical Points:", historicalPoints.toFixed(2), "Start Avg:", (historicalPoints / historicalSessions).toFixed(2));

  const chartData = [];
  if (historicalSessions > 0) {
    chartData.push({
      name: "Départ",
      average: cumulativePoints / cumulativeSessions
    });
  }

  const chronologicalPools = [...poolPlayers].reverse();
  for (const pp of chronologicalPools) {
    let sessionPoints = 0;
    for (const match of pp.pool.matches) {
      const isTeam1 = match.team1Player1Id === player.id || match.team1Player2Id === player.id;
      const isTeam2 = match.team2Player1Id === player.id || match.team2Player2Id === player.id;
      if (!isTeam1 && !isTeam2) continue;

      const myGames = isTeam1 ? match.team1Games : match.team2Games;
      const theirGames = isTeam1 ? match.team2Games : match.team1Games;
      if (myGames === null || theirGames === null) continue;

      sessionPoints += myGames;
      if (myGames > theirGames) sessionPoints += 30;
      else if (myGames === theirGames) sessionPoints += 20;
      else sessionPoints += 10;
    }
    
    const sessAvg = sessionPoints / 3;
    cumulativePoints += sessAvg;
    cumulativeSessions++;
    
    const dateStr = new Date(pp.pool.session.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    chartData.push({
      name: dateStr,
      sessAvg: sessAvg.toFixed(2),
      average: cumulativeSessions > 0 ? cumulativePoints / cumulativeSessions : 0
    });
  }
  
  chartData.forEach(d => console.log(`${d.name}: Avg ${d.average.toFixed(2)} (Session Perf: ${d.sessAvg || 'N/A'})`));
}

async function main() {
    await printChartData('JP');
    await printChartData('Bacho');
}

main().finally(() => prisma.$disconnect());
