import { PrismaClient } from '@prisma/client';

// Executar o `npx prisma generate` garante a inferencia dos tipos das propriedades
const prisma = new PrismaClient();

async function main() {
  // Para testarmos, sempre iremos deletar os dados do banco
  // isso não é usado em produção
  await prisma.user.deleteMany({}); 

  // função que semeia um novo usuário
  const user = await prisma.user.create({
    data: {
      email: 'teste@email.com',
      firstname: 'Jonh',
      lastname: 'Bell',
      social: {
        facebook: 'jonhbell',
        twitter: 'thejonh',
      },
    },
  });
}

main()
  .catch((e: Error) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Desconecta o Prisma Client
    await prisma.$disconnect();
  });
