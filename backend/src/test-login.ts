import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@checklist.com';
  const password = 'adminpassword123';
  const passwordLocal = 'admin123';

  console.log(`Looking for user: ${email}`);
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log('USER NOT FOUND IN DATABASE!');
    // Let's print all users
    const allUsers = await prisma.user.findMany();
    console.log('All users in DB:', allUsers.map(u => ({ email: u.email, role: u.role, status: u.status })));
    return;
  }

  console.log('User found:', { email: user.email, role: user.role, status: user.status });

  // Test adminpassword123
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  console.log(`Does '${password}' match hash?`, isMatch);

  // Test admin123
  const isMatchLocal = await bcrypt.compare(passwordLocal, user.passwordHash);
  console.log(`Does '${passwordLocal}' match hash?`, isMatchLocal);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
