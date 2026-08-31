import { PrismaClient } from '../prisma-client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.driver.upsert({
    where: { phone: '+919812345670' },
    update: {},
    create: { name: 'Asha Rao', phone: '+919812345670', vehicleType: 'SEDAN', status: 'OFFLINE' },
  });
  await prisma.driver.upsert({
    where: { phone: '+919812300000' },
    update: {},
    create: { name: 'Demo Driver', phone: '+919812300000', vehicleType: 'AUTO', status: 'OFFLINE' },
  });
  // eslint-disable-next-line no-console
  console.log('driver-service: seed complete');
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
