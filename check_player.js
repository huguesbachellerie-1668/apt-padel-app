import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPlayer(name) {
  const user = await prisma.user.findFirst({ where: { name: { contains: name } } });
  if (!user) { console.log("User not found"); return; }
  
  const season = await prisma.season.findFirst({ where: { name: 'Saison 2025-2026' } });

  const poolPlayers = await prisma.poolPlayer.findMany({
    where: { 
      userId: user.id,
      pool: { session: { seasonId: season.id, status: 'TERMINEE', isCounted: true } }
    },
    include: {
      pool: {
        include: {
          session: true,
          matches: true
        }
      }
    },
    orderBy: { pool: { session: { date: 'asc' } } }
  });

  console.log(`Analyzing ${poolPlayers.length} sessions for ${user.name}`);

  for (const pp of poolPlayers) {
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let validMatches = 0;
    
    for (const match of pp.pool.matches) {
      const isTeam1 = match.team1Player1Id === user.id || match.team1Player2Id === user.id;
      const isTeam2 = match.team2Player1Id === user.id || match.team2Player2Id === user.id;
      if (!isTeam1 && !isTeam2) continue;

      const myGames = isTeam1 ? match.team1Games : match.team2Games;
      const theirGames = isTeam1 ? match.team2Games : match.team1Games;
      
      if (myGames === null || theirGames === null) continue;
      if (myGames === 0 && theirGames === 0) continue; // forfait

      validMatches++;
      if (myGames > theirGames) wins++;
      else if (myGames === theirGames) draws++;
      else losses++;
    }

    const isTop = validMatches === 3 && (wins === 3 || (wins === 2 && draws === 1));
    const isFlop = validMatches === 3 && losses === 3;
    
    if (isTop || isFlop) {
        console.log(`Session: ${pp.pool.session.date.toISOString().split('T')[0]}, Level: ${pp.pool.level}, Wins: ${wins}, Draws: ${draws}, Losses: ${losses} => ${isTop ? 'TOP' : 'FLOP'}`);
    } else {
        console.log(`Session: ${pp.pool.session.date.toISOString().split('T')[0]}, Level: ${pp.pool.level}, Wins: ${wins}, Draws: ${draws}, Losses: ${losses} => -`);
    }
  }
}

checkPlayer('Hugues').catch(console.error).finally(() => prisma.$disconnect());
