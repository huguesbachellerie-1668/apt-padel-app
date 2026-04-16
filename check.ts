import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkLucien() {
  const users = await prisma.user.findMany({
    where: { OR: [{ name: { contains: 'Lucien', mode: 'insensitive' } }, { nickname: { contains: 'Lucien', mode: 'insensitive' } }] }
  });
  console.log("Users matching Lucien:", users.map((u: any) => ({ id: u.id, name: u.name, avg: u.averagePoints, points: u.points, lastLvl: u.lastCalculatedLevel })));

  const activeSession = await prisma.session.findFirst({
    where: { status: 'POULES_GENEREES' },
    orderBy: { date: 'desc' }
  });

  if (activeSession) {
     const pools = await prisma.pool.findMany({
       where: { sessionId: activeSession.id },
       include: { players: { include: { user: true } } }
     });
     console.log(`\nSession ${activeSession.id} has ${pools.length} pools.`);
     pools.sort((a:any,b:any) => a.level - b.level).forEach((p:any) => {
       console.log(`Pool ${p.level}:`);
       p.players.sort((a:any,b:any) => a.seed - b.seed).forEach((pl:any) => {
         console.log(`  Seed ${pl.seed}: ${pl.user.name} (Avg: ${pl.user.averagePoints}, Pts: ${pl.user.points}, LastLvl: ${pl.user.lastCalculatedLevel})`);
       });
     });
  }
}

checkLucien().catch(console.error).finally(() => prisma.$disconnect());
