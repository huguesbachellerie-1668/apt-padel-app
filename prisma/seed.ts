import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Clean up
  await prisma.match.deleteMany();
  await prisma.poolPlayer.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.session.deleteMany();
  await prisma.season.deleteMany();
  await prisma.user.deleteMany();

  // Create Board
  await prisma.user.create({
    data: {
      name: "Hugues Bachellerie",
      nickname: "Bacho",
      role: "PRESIDENT",
      points: 150,
      averagePoints: 25,
      totalMatches: 6
    }
  });

  await prisma.user.create({
    data: {
      name: "Benoît Demaret",
      nickname: "Ben",
      role: "ORGA",
      points: 170,
      averagePoints: 28.33,
      totalMatches: 6
    }
  });

  await prisma.user.create({
    data: {
      name: "Pascal Berger",
      nickname: "Paco",
      role: "TRESORIER",
      points: 140,
      averagePoints: 23.33,
      totalMatches: 6
    }
  });

  // Create some regular players
  for (let i = 1; i <= 30; i++) {
    await prisma.user.create({
      data: {
        name: `Joueur ${i}`,
        role: "JOUEUR",
        points: Math.floor(Math.random() * 100) + 50,
        averagePoints: 15 + Math.random() * 15, // between 15 and 30 avg
        totalMatches: 5
      }
    });
  }

  console.log("Database seeded successfully!")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
