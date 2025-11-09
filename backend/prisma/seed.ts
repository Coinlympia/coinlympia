import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const { MaticPriceFeeds } = await import('../../frontend/src/modules/coinleague/constants/PriceFeeds/matic.js');

  const targetChainId = 137;

  const tokens = MaticPriceFeeds || [];

  if (tokens.length === 0) {
    console.log(`No tokens found for chain ${targetChainId}`);
    return;
  }

  for (const token of tokens) {
    await prisma.gameToken.upsert({
      where: {
        address: token.address,
      },
      update: {
        symbol: token.base,
        name: token.baseName,
        base: token.base,
        baseName: token.baseName,
        quote: token.quote || 'USD',
        logo: token.logo,
        tv: token.tv,
        chainId: targetChainId,
        isActive: true,
      },
      create: {
        address: token.address,
        symbol: token.base,
        name: token.baseName,
        base: token.base,
        baseName: token.baseName,
        quote: token.quote || 'USD',
        logo: token.logo,
        tv: token.tv,
        chainId: targetChainId,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${tokens.length} tokens for chain ${targetChainId} (Polygon)`);

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

