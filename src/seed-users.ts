import { PrismaClient } from '@prisma/client';
import { add } from 'date-fns';

// Executar o `npx prisma generate` garante a inferencia dos tipos das propriedades
const prisma = new PrismaClient();

async function main() {
  // Para testarmos, sempre iremos deletar os dados do banco
  await prisma.user.deleteMany({}); // isso não é usado em produção
  // Nota: a ordem dessas chamadas importa
  await prisma.test.deleteMany({}); // isso não é usado em produção
  await prisma.course.deleteMany({}); // isso não é usado em produção

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

  // Cria timestamps
  const weekFromNow = add(new Date(), { days: 7 });
  const twoWeeksFromNow = add(new Date(), { days: 14 });
  const monthFromNow = add(new Date(), { days: 28 });

  const course = await prisma.course.create({
    data: {
      // Propriedade da entidade Course
      name: 'Build a modern API with Prisma, Typescript and Postgres',
      // Propriedades da relação de Course com Test
      test: {
        create: [
          {
            date: weekFromNow,
            name: 'First Test',
          },
          {
            date: twoWeeksFromNow,
            name: 'Secound Test',
          },
          {
            date: monthFromNow,
            name: 'Final exam',
          },
        ],
      },
      // Cria o usuário como um professor relacionado ao curso
      members: {
        create: {
          // Define a regra como professor
          role: 'TEACHER',
          user: {
            // Conecta o usuário pois ele já existe
            connect: { email: user.email },
          },
        },
      },
    },
    // Inclui na saída os valores das tabelas relacionadas
    include: {
      test: true,
      members: { include: { user: true } },
    },
  });
  console.log(course);
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
