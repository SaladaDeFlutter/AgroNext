import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) { console.log('No users found'); return; }
  
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'default', { expiresIn: '1h' });
  console.log(`User: ${user.name} (${user.email})`);
  console.log(`Token: ${token}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
