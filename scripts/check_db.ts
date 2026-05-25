import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const session24 = await prisma.session.findFirst({
    where: {
      date: {
        gte: new Date('2026-05-24T00:00:00.000Z'),
        lt: new Date('2026-05-25T00:00:00.000Z')
      }
    }
  });
  console.log("Session 24 isCounted:", session24?.isCounted);

  const philou = await prisma.user.findFirst({
    where: { name: { contains: 'Philou' } }
  });
  console.log("Philou points:", philou?.points, "average:", philou?.averagePoints);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
