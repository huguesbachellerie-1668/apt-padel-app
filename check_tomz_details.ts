import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDetails() {
  const users = await prisma.user.findMany({
    where: {
      nickname: { contains: 'TomZ', mode: 'insensitive' }
    }
  });

  if (users.length === 0) {
    console.log("TomZ not found!");
    return;
  }

  const tomZ = users[0];
  console.log(`Found TomZ: ${tomZ.name} (avg points: ${tomZ.averagePoints}, lastCalculatedLevel: ${tomZ.lastCalculatedLevel})`);

  // Find the session on June 7, 2026
  const session = await prisma.session.findFirst({
    where: {
      date: {
        gte: new Date('2026-06-07T00:00:00.000Z'),
        lt: new Date('2026-06-08T00:00:00.000Z')
      }
    }
  });

  if (!session) return;

  const reg = await prisma.registration.findFirst({
    where: {
      sessionId: session.id,
      userId: tomZ.id
    }
  });

  console.log(`TomZ Registration: isReturningFromInjury = ${reg?.isReturningFromInjury}`);
}

checkDetails()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
