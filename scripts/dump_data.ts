import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log("Dumping data from SQLite...");
  const data = {
    users: await prisma.user.findMany(),
    seasons: await prisma.season.findMany(),
    sessions: await prisma.session.findMany(),
    registrations: await prisma.registration.findMany(),
    pools: await prisma.pool.findMany(),
    poolPlayers: await prisma.poolPlayer.findMany(),
    matches: await prisma.match.findMany(),
  };

  fs.writeFileSync('dump.json', JSON.stringify(data, null, 2));
  console.log(`Data dumped to dump.json! Users: ${data.users.length}, Matches: ${data.matches.length}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
