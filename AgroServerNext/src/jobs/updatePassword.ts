import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'fluttered001@gmail.com';
  const newPassword = 'portacopos717';
  const hash = bcrypt.hashSync(newPassword, 10);
  
  const user = await prisma.user.update({
    where: { email },
    data: { password: hash },
    select: { id: true, email: true, name: true }
  });
  
  console.log('Senha alterada com sucesso!');
  console.log('Usuário:', user);
}

main().finally(() => prisma.$disconnect());
