import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function traceLucienHistory() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Lucien', mode: 'insensitive' } },
    include: { poolPlayers: { include: { pool: { include: { session: true } } } } }
  });

  if (!user) return console.log("User not found");

  console.log(`History for ${user.name}:`);
  const pools = user.poolPlayers.map(p => ({
    date: p.pool.session.date,
    sessionId: p.pool.session.id,
    poolLevel: p.pool.level,
    seed: p.seed
  })).sort((a:any, b:any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  pools.forEach(p => console.log(`Session ${p.date.toISOString().split('T')[0]}: Pool ${p.poolLevel} Seed ${p.seed}`));
  
  console.log(`Current DB lastCalculatedLevel: ${user.lastCalculatedLevel}`);
}

traceLucienHistory().finally(() => prisma.$disconnect());
