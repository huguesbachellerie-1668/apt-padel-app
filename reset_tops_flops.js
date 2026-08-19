import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { 
        OR: [
            { tops: { gt: 0 } },
            { flops: { gt: 0 } }
        ]
    }
  });
  console.log(`Found ${users.length} users with tops or flops`);
  for (const user of users) {
      await prisma.user.update({
          where: { id: user.id },
          data: {
              tops: 0,
              flops: 0
          }
      });
  }
  console.log("Reset tops and flops.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
