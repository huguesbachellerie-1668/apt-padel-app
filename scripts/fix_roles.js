const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  let found = 0;
  for (const u of users) {
    if (u.nickname?.toLowerCase() === 'bacho' || u.name.toLowerCase().includes('bacho') || u.name.toLowerCase().includes('hugues')) {
      await prisma.user.update({ where: { id: u.id }, data: { role: 'PRESIDENT' } });
      console.log('Restored Bacho: ' + u.name);
      found++;
    }
    if ((u.nickname?.toLowerCase() === 'ben' || u.nickname?.toLowerCase() === 'benoit') || u.name.toLowerCase().includes('benoît') || u.name.toLowerCase().includes('desmaret')) {
      await prisma.user.update({ where: { id: u.id }, data: { role: 'ORGA' } });
      console.log('Restored Benoit: ' + u.name);
      found++;
    }
    if (u.nickname?.toLowerCase() === 'paco' || u.name.toLowerCase().includes('paco')) {
      await prisma.user.update({ where: { id: u.id }, data: { role: 'TRESORIER' } });
      console.log('Restored Paco: ' + u.name);
      found++;
    }
  }
  if (found === 0) {
    console.log("None of the admins were found! Here is the list of nicknames:");
    console.log(users.map(u => u.nickname).join(', '));
  }
}
main().finally(() => prisma.$disconnect());
