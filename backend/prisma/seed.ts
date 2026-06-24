import { PrismaClient } from '@prisma/client';
import { Role, UserStatus } from '../src/types/enums';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@checklist.com';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const passwordHash = await bcrypt.hash('adminpassword123', 10);
    const admin = await prisma.user.create({
      data: {
        email,
        name: 'System Administrator',
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(`Admin user seeded: ${admin.email} (Password: adminpassword123)`);
  } else {
    console.log('Admin user already exists.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
