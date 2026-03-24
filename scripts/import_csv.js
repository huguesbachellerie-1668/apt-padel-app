const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const filePath = "C:\\Users\\veronique\\Documents\\HB\\APT\\NOM APT.csv";
  const content = fs.readFileSync(filePath, 'latin1'); // Use latin1 to avoid utf-8 BOM issues with accents on Windows
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

  // Skip header
  let added = 0;
  let updated = 0;

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

    // Check if user exists by Nickname
    let user = null;
    
    if (surnom) {
        user = await prisma.user.findFirst({
            where: { nickname: surnom }
        });
    }

    if (!user && (prenom || nom)) {
      // Find all users and filter in JS to avoid case sensitivity issues
      const allUsers = await prisma.user.findMany();
      user = allUsers.find(u => 
        u.name.toLowerCase().includes(nom.toLowerCase()) || 
        (prenom && u.name.toLowerCase().includes(prenom.toLowerCase())) ||
        (surnom && u.nickname && u.nickname.toLowerCase() === surnom.toLowerCase())
      );
    }

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: fullName,
          nickname: surnom,
          averagePoints,
          tops,
          flops,
          points,
          totalMatches
        }
      });
      updated++;
    } else {
      await prisma.user.create({
        data: {
          name: fullName,
          nickname: surnom,
          averagePoints,
          tops,
          flops,
          points,
          totalMatches,
          role: 'JOUEUR'
        }
      });
      added++;
    }
  }

  console.log(`Import terminé ! ${added} ajoutés, ${updated} mis à jour.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
