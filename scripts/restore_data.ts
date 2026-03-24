import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log("Restoring data to PostgreSQL...");
  const rawData = fs.readFileSync('dump.json', 'utf-8');
  const data = JSON.parse(rawData);

  console.log(`Clearing existing data...`);
  // Deleting in reverse dependency order
  await prisma.match.deleteMany();
  await prisma.poolPlayer.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.session.deleteMany();
  await prisma.season.deleteMany();
  await prisma.user.deleteMany();

  console.log(`Inserting ${data.users.length} Users...`);
  await prisma.user.createMany({ data: data.users });

  console.log(`Inserting ${data.seasons.length} Seasons...`);
  await prisma.season.createMany({ data: data.seasons });

  console.log(`Inserting ${data.sessions.length} Sessions...`);
  await prisma.session.createMany({ data: data.sessions });

  console.log(`Inserting ${data.registrations.length} Registrations...`);
  await prisma.registration.createMany({ data: data.registrations });

  console.log(`Inserting ${data.pools.length} Pools...`);
  await prisma.pool.createMany({ data: data.pools });

  console.log(`Inserting ${data.poolPlayers.length} PoolPlayers...`);
  await prisma.poolPlayer.createMany({ data: data.poolPlayers });

  console.log(`Inserting ${data.matches.length} Matches...`);
  await prisma.match.createMany({ data: data.matches });

  console.log("Data restored successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
