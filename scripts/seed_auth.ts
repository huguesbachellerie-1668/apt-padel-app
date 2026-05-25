import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  let updatedEmail = 0;
  let updatedPassword = 0;
  let index = 1;

  const defaultPasswordStr = 'Apt2026!';
  const defaultPasswordHash = await bcrypt.hash(defaultPasswordStr, 10);

  for (const user of users) {
    let email = user.email;
    let password = user.password;
    let needsUpdate = false;

    if (!email) {
       const cleanName = user.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.');
       email = `${cleanName}.${index}@apt.fr`;
       updatedEmail++;
       needsUpdate = true;
    }
    index++;

    if (!password) {
       password = defaultPasswordHash;
       updatedPassword++;
       needsUpdate = true;
    }

    if (needsUpdate) {
        await prisma.user.update({
           where: { id: user.id },
           data: { email, password }
        });
        console.log(`User ${user.name}: Set email to ${email}`);
    }
  }

  console.log(`\nFinished: Generated ${updatedEmail} missing emails. Seeded ${updatedPassword} missing passwords to '${defaultPasswordStr}'.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
