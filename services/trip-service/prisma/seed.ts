import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../prisma-client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const existing = await prisma.ride.findFirst();
  if (existing) {
    // eslint-disable-next-line no-console
    console.log('trip-service: seed data already present, skipping');
    return;
  }

  await prisma.ride.create({
    data: {
      riderId: randomUUID(),
      pickupLat: 12.9716,
      pickupLng: 77.5946,
      destinationLat: 12.9352,
      destinationLng: 77.6146,
      status: 'MATCHING',
      events: {
        create: {
          eventType: 'ride.requested',
          eventId: randomUUID(),
        },
      },
    },
  });

  // eslint-disable-next-line no-console
  console.log('trip-service: seed complete');
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
