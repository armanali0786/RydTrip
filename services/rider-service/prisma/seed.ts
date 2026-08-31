import { PrismaClient } from '../prisma-client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.rider.upsert({
    where: { phone: '+919876543210' },
    update: {},
    create: { name: 'Priya Sharma', phone: '+919876543210' },
  });
  await prisma.rider.upsert({
    where: { phone: '+919876500000' },
    update: {},
    create: { name: 'Demo Rider', phone: '+919876500000' },
  });
  // eslint-disable-next-line no-console
  console.log('rider-service: seed complete');
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
