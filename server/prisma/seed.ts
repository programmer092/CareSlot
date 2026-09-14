import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';

const DEMO_PASSWORD = 'password';
const HOUR_MS = 60 * 60 * 1000;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const password = await argon2.hash(DEMO_PASSWORD);

  const provider = await prisma.user.upsert({
    where: { email: 'provider@gmail.com' },
    update: {},
    create: {
      email: 'provider@gmail.com',
      name: 'Demo Provider',
      role: 'PROVIDER',
      password,
    },
  });

  await prisma.user.upsert({
    where: { email: 'client@gmail.com' },
    update: {},
    create: {
      email: 'client@gmail.com',
      name: 'Demo Client',
      role: 'CLIENT',
      password,
    },
  });

  const slots: Prisma.SlotCreateManyInput[] = [];
  for (let day = 1; day <= 5; day++) {
    for (let hour = 9; hour < 12; hour++) {
      const startAt = new Date();
      startAt.setUTCDate(startAt.getUTCDate() + day);
      startAt.setUTCHours(hour, 0, 0, 0);
      slots.push({
        providerId: provider.id,
        startAt,
        endAt: new Date(startAt.getTime() + HOUR_MS),
      });
    }
  }
  const { count } = await prisma.slot.createMany({
    data: slots,
    skipDuplicates: true,
  });

  console.log(`Seeded provider ${provider.email} with ${count} new slot(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
