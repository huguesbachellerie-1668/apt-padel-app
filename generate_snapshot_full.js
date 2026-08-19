import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const season = await prisma.season.findFirst({
    where: { name: 'Saison 2025-2026' },
    include: {
      sessions: {
        where: { status: 'TERMINEE', isCounted: true },
        include: {
          pools: {
            include: {
              players: { include: { user: true } },
              matches: true
            }
          }
        }
      }
    }
  });

  if (!season) {
    console.log("Season not found");
    return;
  }

  const userStats = {};

  for (const session of season.sessions) {
    for (const pool of session.pools) {
      for (const poolPlayer of pool.players) {
        const userId = poolPlayer.userId;
        if (!userStats[userId]) {
          userStats[userId] = {
            name: poolPlayer.user.name,
            nickname: poolPlayer.user.nickname,
            stars: poolPlayer.user.stars,
            totalMatches: 0,
            validMatches: 0,
            wins: 0,
            points: 0,
            tops: 0,
            flops: 0,
            sessionsCount: 0
          };
        }

        const stats = userStats[userId];
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

  const ranking = Object.values(userStats).map(s => {
    s.averagePoints = s.sessionsCount > 0 ? (s.points / s.sessionsCount) : 0;
    return s;
  }).filter(s => s.totalMatches > 0);

  ranking.sort((a, b) => b.averagePoints - a.averagePoints);

  let md = `# Classement Final Officiel - Saison 2025-2026\n\n`;
  md += `> [!NOTE]\n> Voici la photographie complète des statistiques de fin de saison extraite directement de la base de données. Elle inclut tous les matchs comptabilisés de la Saison 2025-2026.\n\n`;
  md += `| Rang | Joueur | Moyenne pts | Sessions | Matchs | Victoires | Win Rate | Points Totaux | Tops | Flops |\n`;
  md += `|------|--------|-------------|----------|--------|-----------|----------|---------------|------|-------|\n`;
  
  ranking.forEach((r, i) => {
    const displayName = r.nickname ? `${r.nickname} (${r.name})` : r.name;
    const avg = r.averagePoints.toFixed(2);
    const winRate = Math.round((r.wins / r.totalMatches) * 100) + '%';
    md += `| ${i + 1} | ${displayName} | **${avg}** | ${r.sessionsCount} | ${r.totalMatches} | ${r.wins} | ${winRate} | ${Math.floor(r.points)} | ${r.tops} | ${r.flops} |\n`;
  });

  fs.writeFileSync('C:\\Users\\veronique\\.gemini\\antigravity\\brain\\b2e905b2-e875-4f22-8ae2-4e83f9a7d8d7\\classement_2025_2026.md', md);
  console.log('Artifact created.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
