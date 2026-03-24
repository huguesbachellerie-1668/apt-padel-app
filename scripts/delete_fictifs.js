const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.deleteMany({
    where: { name: { startsWith: 'Joueur ' } }
  });
  console.log(`Deleted ${result.count} fictif players.`);
}

main().finally(() => prisma.$disconnect());
