import prisma from './src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Issam', mode: 'insensitive' } },
        { nickname: { contains: 'Issam', mode: 'insensitive' } },
        { name: { contains: 'Tifab', mode: 'insensitive' } },
        { nickname: { contains: 'Tifab', mode: 'insensitive' } },
        { name: { contains: 'Henri', mode: 'insensitive' } },
        { nickname: { contains: 'Henri', mode: 'insensitive' } }
      ]
    }
  });

  console.log('--- USERS ---');
  for (const u of users) {
    console.log(`${u.name} (Nickname: ${u.nickname}) - Points: ${u.points}, Average: ${u.averagePoints}`);
    
    // Get last pool
    const lastPoolPlayer = await prisma.poolPlayer.findFirst({
      where: { 
        userId: u.id,
        pool: { session: { status: 'TERMINEE' } }
      },
      orderBy: { pool: { session: { date: 'desc' } } },
      include: { pool: true }
    });
    console.log(`  Last Pool: ${lastPoolPlayer ? lastPoolPlayer.pool.level : 'None'}`);

    // Get current registration
    const currentRegistration = await prisma.registration.findFirst({
      where: { userId: u.id },
      orderBy: { createdAt: 'desc' },
      include: { session: true }
    });
    console.log(`  Current Registration Injury: ${currentRegistration?.isReturningFromInjury}`);
    
    // Get current pool
    const currentPoolPlayer = await prisma.poolPlayer.findFirst({
      where: { 
        userId: u.id,
        pool: { session: { status: { in: ['POULES_GENEREES', 'POULES_EN_ATTENTE'] } } }
      },
      orderBy: { pool: { session: { date: 'desc' } } },
      include: { pool: true }
    });
    console.log(`  Current Pool: ${currentPoolPlayer ? currentPoolPlayer.pool.level : 'None'}`);
    console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
