import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDuplicateUsers() {
  try {
    console.log('Searching for duplicate users...');

    const duplicates = await prisma.$queryRaw<Array<{ address: string; count: number }>>`
      SELECT LOWER(address) as address, COUNT(*) as count
      FROM "user_accounts"
      GROUP BY LOWER(address)
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length === 0) {
      console.log('No duplicate users found.');
      return;
    }

    console.log(`Found ${duplicates.length} duplicate addresses.`);

    for (const dup of duplicates) {
      const normalizedAddress = dup.address.toLowerCase();
      console.log(`\nProcessing address: ${normalizedAddress} (${dup.count} duplicates)`);

      const users = await prisma.$queryRaw<Array<{
        id: string;
        address: string;
        username: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>>`
        SELECT id, address, username, "createdAt", "updatedAt"
        FROM "user_accounts"
        WHERE LOWER(address) = LOWER(${normalizedAddress})
        ORDER BY "createdAt" ASC
      `;

      if (users.length === 0) continue;

      const keepUser = users[0];
      const duplicateUsers = users.slice(1);

      console.log(`  ✓ Keeping user: ${keepUser.id} (created: ${keepUser.createdAt})`);

      for (const dupUser of duplicateUsers) {
        console.log(`  - Deleting duplicate: ${dupUser.id} (created: ${dupUser.createdAt})`);

        if (dupUser.username && !keepUser.username) {
          console.log(`    → Transferring username: ${dupUser.username}`);
          await prisma.userAccount.update({
            where: { id: keepUser.id },
            data: { username: dupUser.username },
          });
        }

        await prisma.$executeRaw`
          UPDATE "game_participants" gp1
          SET "userAddress" = ${normalizedAddress}
          WHERE LOWER(gp1."userAddress") = LOWER(${dupUser.address})
          AND NOT EXISTS (
            SELECT 1 FROM "game_participants" gp2
            WHERE gp2."gameId" = gp1."gameId"
            AND LOWER(gp2."userAddress") = LOWER(${normalizedAddress})
          )
        `;

        await prisma.$executeRaw`
          DELETE FROM "game_participants" gp1
          WHERE LOWER(gp1."userAddress") = LOWER(${dupUser.address})
          AND EXISTS (
            SELECT 1 FROM "game_participants" gp2
            WHERE gp2."gameId" = gp1."gameId"
            AND LOWER(gp2."userAddress") = LOWER(${normalizedAddress})
          )
        `;

        await prisma.$executeRaw`
          UPDATE "game_results" gr1
          SET "userAddress" = ${normalizedAddress}
          WHERE LOWER(gr1."userAddress") = LOWER(${dupUser.address})
          AND NOT EXISTS (
            SELECT 1 FROM "game_results" gr2
            WHERE gr2."gameId" = gr1."gameId"
            AND LOWER(gr2."userAddress") = LOWER(${normalizedAddress})
          )
        `;

        await prisma.$executeRaw`
          DELETE FROM "game_results" gr1
          WHERE LOWER(gr1."userAddress") = LOWER(${dupUser.address})
          AND EXISTS (
            SELECT 1 FROM "game_results" gr2
            WHERE gr2."gameId" = gr1."gameId"
            AND LOWER(gr2."userAddress") = LOWER(${normalizedAddress})
          )
        `;

        await prisma.$executeRaw`
          UPDATE "games"
          SET "creatorAddress" = ${normalizedAddress}
          WHERE LOWER("creatorAddress") = LOWER(${dupUser.address})
        `;

        await prisma.$executeRaw`
          UPDATE "affiliate_entries"
          SET "userAddress" = ${normalizedAddress}
          WHERE LOWER("userAddress") = LOWER(${dupUser.address})
        `;

        await prisma.$executeRaw`
          UPDATE "affiliate_entries"
          SET "affiliateAddress" = ${normalizedAddress}
          WHERE LOWER("affiliateAddress") = LOWER(${dupUser.address})
        `;

        await prisma.userAccount.delete({
          where: { id: dupUser.id },
        });
      }

      if (keepUser.address !== normalizedAddress) {
        await prisma.userAccount.update({
          where: { id: keepUser.id },
          data: { address: normalizedAddress },
        });
      }
    }

    console.log('\nNormalizing all addresses to lowercase...');
    const allUsers = await prisma.userAccount.findMany({
      select: { id: true, address: true },
    });

    let normalizedCount = 0;
    for (const user of allUsers) {
      const normalizedAddress = user.address.toLowerCase();
      if (user.address !== normalizedAddress) {
        await prisma.userAccount.update({
          where: { id: user.id },
          data: { address: normalizedAddress },
        });
        normalizedCount++;
      }
    }

    console.log(`Normalized ${normalizedCount} addresses to lowercase.`);
    console.log('Process completed successfully.');
  } catch (error) {
    console.error('Error fixing duplicate users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicateUsers()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

