import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkLog() {
  const latestSession = await prisma.session.findFirst({
    orderBy: { date: 'desc' }
  });

  const logs = await prisma.activityLog.findMany({
    where: { sessionId: latestSession.id },
    orderBy: { createdAt: 'desc' }
  });

  for (const log of logs) {
    console.log(`[${log.createdAt}] ${log.message}`);
  }
}

checkLog().catch(console.error).finally(() => prisma.$disconnect());
