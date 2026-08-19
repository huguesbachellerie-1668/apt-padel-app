import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true }
  });

  if (activeSeason) {
    if (activeSeason.name === 'Saison 2026-2027') {
      console.log('Already created.');
      return;
    }
    await prisma.season.update({
      where: { id: activeSeason.id },
      data: { isActive: false }
    });
  }

  await prisma.season.create({
    data: {
      name: 'Saison 2026-2027',
      startDate: new Date(),
      isActive: true
    }
  });
  console.log("Season Saison 2026-2027 created.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
