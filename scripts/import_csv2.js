const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  await prisma.match.deleteMany();
  await prisma.poolPlayer.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.session.deleteMany();
  await prisma.season.deleteMany();
  await prisma.user.deleteMany();
  console.log("Wiped all tables for a clean slate.");

  const filePath = "C:\\Users\\veronique\\Documents\\HB\\APT\\NOM APT.csv";
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

  let added = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const parts = line.split(';');
    
    const nom = parts[0] ? parts[0].trim() : '';
    const prenom = parts[1] ? parts[1].trim() : '';
    const surnom = parts[2] ? parts[2].trim() : '';
    
    let fullName = `${prenom} ${nom}`.trim();
    if (!fullName) fullName = surnom;
    if (!fullName) continue;

    const parseNumber = (val) => {
        if (!val) return 0;
        return parseFloat(val.replace(',', '.')) || 0;
    };
    
    const averagePoints = parseNumber(parts[3]);
    const tops = parseInt(parts[4]) || 0;
    const flops = parseInt(parts[5]) || 0;
    const points = parseNumber(parts[6]);
    const sessions = parseInt(parts[7]) || 0;
    const totalMatches = sessions * 3;

    let role = 'JOUEUR';
    if (surnom.toLowerCase() === 'bacho' || fullName.toLowerCase().includes('bacho') || fullName.toLowerCase().includes('hugues')) role = 'PRESIDENT';
    if (surnom.toLowerCase() === 'benoit' || fullName.toLowerCase().includes('benoît')) role = 'ORGA';
    if (surnom.toLowerCase() === 'paco' || fullName.toLowerCase().includes('paco')) role = 'TRESORIER';

    await prisma.user.create({
      data: {
        name: fullName,
        nickname: surnom,
        averagePoints,
        tops,
        flops,
        points,
        totalMatches,
        role
      }
    });
    added++;
  }

  console.log(`Import terminé ! ${added} joueurs ajoutés avec leurs vrais rôles du Board.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
