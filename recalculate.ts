import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Mettre la session du 24 Mai en isCounted = false
  const session24 = await prisma.session.findFirst({
    where: {
      date: {
        gte: new Date('2026-05-24T00:00:00.000Z'),
        lt: new Date('2026-05-25T00:00:00.000Z')
      }
    }
  });

  if (session24) {
    await prisma.session.update({
      where: { id: session24.id },
      data: { isCounted: false }
    });
    console.log(`Session du 24/05 (${session24.id}) mise à jour : isCounted = false`);
  } else {
    console.log("Session du 24/05 introuvable.");
  }

  // 2. Recalculer les points de TOUS les utilisateurs
  const users = await prisma.user.findMany();
  console.log(`Recalcul pour ${users.length} utilisateurs...`);

  for (const user of users) {
    // Trouver toutes les participations dans des sessions terminées ET comptabilisées
    const participations = await prisma.poolPlayer.findMany({
      where: { 
        userId: user.id,
        pool: {
          session: {
            status: 'TERMINEE',
            isCounted: true
          }
        }
      },
      include: {
        pool: {
          include: {
            session: true,
            players: { include: { user: true } },
            matches: true
          }
        }
      }
    });

    let totalPoints = 0;
    let tops = 0;
    let flops = 0;
    let sessionsPlayed = participations.length;

    for (const part of participations) {
      const pool = part.pool;
      
      // On a besoin de calculer le classement de cette poule pour savoir si le joueur est top ou flop
      const standings = pool.players.map(pt => {
        let sessionPoints = 0; let w = 0; let d = 0; let l = 0;
        for (const match of pool.matches) {
          const isTeam1 = match.team1Player1Id === pt.userId || match.team1Player2Id === pt.userId;
          const isTeam2 = match.team2Player1Id === pt.userId || match.team2Player2Id === pt.userId;
          if (!isTeam1 && !isTeam2) continue;
          
          const myGames = isTeam1 ? match.team1Games : match.team2Games;
          const theirGames = isTeam1 ? match.team2Games : match.team1Games;
          
          if (myGames === null || theirGames === null) continue;
          
          sessionPoints += myGames;
          if (myGames > theirGames) { sessionPoints += 30; w++; }
          else if (myGames === theirGames) { sessionPoints += 20; d++; }
          else { sessionPoints += 10; l++; }
        }
        return { userId: pt.userId, sessionPoints, w, d, l };
      });

      standings.sort((a, b) => b.sessionPoints - a.sessionPoints);
      const topPlayer = standings.find(s => s.w === 3 || (s.w === 2 && s.d === 1));
      const flopPlayer = [...standings].reverse().find(s => s.l === 3);

      const myStanding = standings.find(s => s.userId === user.id);
      if (myStanding) {
        totalPoints += (myStanding.sessionPoints / 3);
      }

      if (topPlayer && topPlayer.userId === user.id) tops++;
      if (flopPlayer && flopPlayer.userId === user.id) flops++;
    }

    const newAverage = sessionsPlayed > 0 ? (totalPoints / sessionsPlayed) : 0;
    const newTotalMatches = sessionsPlayed * 3;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        points: totalPoints,
        totalMatches: newTotalMatches,
        averagePoints: newAverage,
        tops,
        flops
      }
    });
  }

  console.log("Recalcul terminé avec succès !");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
