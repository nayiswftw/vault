import 'dotenv/config';
import { hash } from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run prisma seed.');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const usersToSeed: SeedUser[] = [
  {
    name: 'Platform Admin',
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@company.com',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    role: Role.ADMIN,
    isActive: true,
  },
  {
    name: 'Finance Analyst',
    email: process.env.SEED_ANALYST_EMAIL ?? 'analyst@company.com',
    password: process.env.SEED_ANALYST_PASSWORD ?? 'Analyst123!',
    role: Role.ANALYST,
    isActive: true,
  },
  {
    name: 'Dashboard Viewer',
    email: process.env.SEED_VIEWER_EMAIL ?? 'viewer@company.com',
    password: process.env.SEED_VIEWER_PASSWORD ?? 'Viewer123!',
    role: Role.VIEWER,
    isActive: true,
  },
];

const seed = async (): Promise<void> => {
  for (const user of usersToSeed) {
    const email = normalizeEmail(user.email);
    const passwordHash = await hash(user.password, 10);

    await prisma.user.upsert({
      where: { email },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
        isActive: user.isActive,
      },
      create: {
        name: user.name,
        email,
        passwordHash,
        role: user.role,
        isActive: user.isActive,
      },
    });
  }

  console.log(`Seeded ${usersToSeed.length} users.`);
};

seed()
  .catch((error: unknown) => {
    console.error('Prisma seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
