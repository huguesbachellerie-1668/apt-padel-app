import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const allUsers = await prisma.user.findMany({ select: { id: true, historicalStats: true } });
  
  let ranking = [];
  for (const u of allUsers) {
      const hist = u.historicalStats ? (typeof u.historicalStats === 'object' ? u.historicalStats : JSON.parse(u.historicalStats)) : {};
      const finalStats = hist['Saison 2025-2026_Final'];
      if (finalStats) {
          ranking.push(finalStats);
      }
  }

  ranking.sort((a, b) => b.averagePoints - a.averagePoints);

  let md = `# Classement Final Officiel (Corrigé avec import initial) - Saison 2025-2026\n\n`;
  md += `> [!NOTE]\n> Voici la photographie complète des statistiques de fin de saison incluant l'historique importé en milieu d'année (raccord avec l'existant) et la fin de saison dans l'app.\n\n`;
  md += `| Rang | Joueur | Moyenne pts | Sessions | Matchs | Victoires estimées | Win Rate | Points Totaux | Tops | Flops |\n`;
  md += `|------|--------|-------------|----------|--------|--------------------|----------|---------------|------|-------|\n`;
  
  ranking.forEach((r, i) => {
    const displayName = r.nickname ? `${r.nickname} (${r.name})` : r.name;
    const avg = r.averagePoints.toFixed(2);
    const winRate = r.totalMatches > 0 ? Math.round((r.wins / r.totalMatches) * 100) + '%' : '-';
    const winsDisplay = r.wins > 0 ? r.wins : '-';
    md += `| ${i + 1} | ${displayName} | **${avg}** | ${r.sessionsCount} | ${r.totalMatches} | ${winsDisplay} | ${winRate} | ${Math.floor(r.points)} | ${r.tops} | ${r.flops} |\n`;
  });

  fs.writeFileSync('C:\\Users\\veronique\\.gemini\\antigravity\\brain\\b2e905b2-e875-4f22-8ae2-4e83f9a7d8d7\\classement_2025_2026_corrige.md', md);
  console.log('Artifact created.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
