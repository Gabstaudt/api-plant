import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function ensureUser(email: string, password: string, fullName: string, role: 'ADMIN'|'VIEWER') {
  const hash = await argon2.hash(password);

  return prisma.user.upsert({
    where: { email },
    create: { email, password: hash, fullName, role },
    update: { password: hash, fullName, role },
    select: { id: true, email: true, role: true }
  });
}

async function main() {
  const admin = await ensureUser('admin@plant.com', '12345678', 'Admin', 'ADMIN');
  const viewer = await ensureUser('usuario@plant.com', '12345678', 'Usuário', 'VIEWER');
  console.log('Seed ok:', { admin, viewer });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
