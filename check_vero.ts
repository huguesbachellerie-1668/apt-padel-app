import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['PRESIDENT', 'ORGA', 'TRESORIER'] }
    }
  });

  console.log("Admins:");
  users.forEach(u => console.log(`${u.name} - ${u.role} - email: ${u.email}`));
}

checkUsers()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
