import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function traceInjury() {
  const activeSession = await prisma.session.findFirst({
    where: { status: 'POULES_GENEREES' },
    orderBy: { date: 'desc' }
  });

  const registrations = await prisma.registration.findMany({
    where: { sessionId: activeSession.id },
    include: { user: true }
  });

  const lucienReg = registrations.find((r:any) => r.user.name.includes('Lucien'));
  if (lucienReg) {
     console.log(`Lucien Registration ID: ${lucienReg.id}`);
     console.log(`Lucien isReturningFromInjury: ${lucienReg.isReturningFromInjury}`);
  }
}

traceInjury().finally(() => prisma.$disconnect());
