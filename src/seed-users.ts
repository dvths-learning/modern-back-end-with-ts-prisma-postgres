import { PrismaClient } from '@prisma/client';
import { add } from 'date-fns';

// Executar o `npx prisma generate` garante a inferencia dos tipos das propriedades
const prisma = new PrismaClient();

async function main() {
  // Para testarmos, sempre iremos deletar os dados do banco
  // Nota: a ordem dessas chamadas importa
  await prisma.courseEnrollment.deleteMany({}); // isso não é usado em produção
  await prisma.testResult.deleteMany({}); // isso não é usado em produção
  await prisma.user.deleteMany({}); // isso não é usado em produção
  await prisma.test.deleteMany({}); // isso não é usado em produção
  await prisma.course.deleteMany({}); // isso não é usado em produção

  // função que semeia um novo usuário
  const firstUser = await prisma.user.create({
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
      tests: {
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
            connect: { email: firstUser.email },
          },
        },
      },
    },
    // Inclui na saída os valores das tabelas relacionadas
    include: {
      tests: true,
      members: { include: { user: true } },
    },
  });

  // Cria dois usuários para um curso com role 'STUDENT'
  const secoundUser = await prisma.user.create({
    data: {
      email: 'secoundUser@email.com',
      firstname: 'Mary',
      lastname: 'Anne',
      social: {
        linkedin: 'meryanneworks',
      },
      courses: {
        create: {
          role: 'STUDENT',
          course: {
            connect: { id: course.id },
          },
        },
      },
    },
  });

  const thirdUser = await prisma.user.create({
    data: {
      email: 'thirdUser@email.com',
      firstname: 'Alice',
      lastname: 'Manson',
      social: {
        twitter: 'alicepower',
      },
      courses: {
        create: {
          role: 'STUDENT',
          course: {
            connect: { id: course.id },
          },
        },
      },
    },
  });

  const testResults = [800, 950, 700];

  let counter = 0;

  for (const test of course.tests) {
    const secoundUserResults = await prisma.testResult.create({
      data: {
        gradedBy: { connect: { email: firstUser.email } },
        student: { connect: { email: secoundUser.email } },
        test: { connect: { id: test.id } },
        result: testResults[counter],
      },
    });
    counter++;
  }

  // Faz uma query agregada para obter as informações
  const results = await prisma.testResult.aggregate({
    where: { studentId: secoundUser.id },
    _avg: { result: true },
    _max: { result: true },
    _min: { result: true },
    _count: true,
  });

  console.log(results);
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
