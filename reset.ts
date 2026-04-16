import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function resetDB() {
  const result = await prisma.user.updateMany({
    data: { lastCalculatedLevel: null }
  });
  console.log(`Reset lastCalculatedLevel for ${result.count} users.`);
}

resetDB().catch(console.error).finally(() => prisma.$disconnect());
