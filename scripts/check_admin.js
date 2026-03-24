const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { 
      OR: [
        { role: 'PRESIDENT' },
        { role: 'ORGA' },
        { role: 'TRESORIER' },
        { nickname: 'Bacho' }
      ]
    }
  });
  console.log(JSON.stringify(users, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
