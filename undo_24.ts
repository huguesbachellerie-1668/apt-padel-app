import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const session24 = await prisma.session.findFirst({
    where: {
      date: {
        gte: new Date('2026-05-24T00:00:00.000Z'),
        lt: new Date('2026-05-25T00:00:00.000Z')
      }
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

  if (!session24) {
    console.log("Session du 24/05 introuvable.");
    return;
  }

  if (!session24.isCounted) {
    console.log("La session n'est déjà plus comptabilisée.");
    return;
  }

  console.log("Annulation des points pour la session :", session24.id);

  for (const pool of session24.pools) {
    // Calculer le classement de la poule
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
      return { userId: pt.userId, sessionPoints, w, d, l, user: pt.user };
    });

    standings.sort((a, b) => b.sessionPoints - a.sessionPoints);
    const topPlayer = standings.find(s => s.w === 3 || (s.w === 2 && s.d === 1));
    const flopPlayer = [...standings].reverse().find(s => s.l === 3);

    // Retirer les points
    for (const standing of standings) {
      const user = standing.user;
      const pointsToSubtract = standing.sessionPoints / 3;
      
      const newTotalMatches = Math.max(0, user.totalMatches - 3);
      const newTotalPoints = Math.max(0, user.points - pointsToSubtract);
      const newSessionsPlayed = newTotalMatches / 3;
      const newAverage = newSessionsPlayed > 0 ? (newTotalPoints / newSessionsPlayed) : 0;
      
      const isTop = topPlayer && topPlayer.userId === user.id;
      const isFlop = flopPlayer && flopPlayer.userId === user.id;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          points: newTotalPoints,
          totalMatches: newTotalMatches,
          averagePoints: newAverage,
          tops: isTop ? Math.max(0, user.tops - 1) : user.tops,
          flops: isFlop ? Math.max(0, user.flops - 1) : user.flops
        }
      });
      console.log(`Joueur ${user.name}: -${pointsToSubtract} pts | Moyenne passe à ${newAverage.toFixed(2)}`);
    }
  }

  await prisma.session.update({
    where: { id: session24.id },
    data: { isCounted: false }
  });

  console.log("Terminé avec succès. La session est maintenant isCounted = false.");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
