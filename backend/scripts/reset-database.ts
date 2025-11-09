import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('Resetting database...');

    console.log('  - Deleting affiliate entries...');
    await prisma.affiliateEntry.deleteMany({});

    console.log('  - Deleting game results...');
    await prisma.gameResult.deleteMany({});

    console.log('  - Deleting participant coin feeds...');
    await prisma.gameParticipantCoinFeed.deleteMany({});

    console.log('  - Deleting game participants...');
    await prisma.gameParticipant.deleteMany({});

    console.log('  - Deleting game coin feeds...');
    await prisma.gameCoinFeed.deleteMany({});

    console.log('  - Deleting games...');
    await prisma.game.deleteMany({});

    console.log('  - Deleting game tokens...');
    await prisma.gameToken.deleteMany({});

    console.log('  - Deleting user accounts...');
    await prisma.userAccount.deleteMany({});

    console.log('Database reset successfully. All tables are empty.');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

