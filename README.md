# Construção de um back-end moderno com TypeScript, PostgreSQL e Prisma ORM

## Descrição

Esse estudo explora e demonstra diferentes padrões, problemas e arquiteturas
para back-end moderno, resolvendo um problema concreto: **um sistema de
classificação para cursos online**. O estudo está concentrado no papel do banco
de dados em todos os aspectos do desenvolvimento back-end incluíndo:

- [Modelagem de dados](#modelagem-de-dados)
- CRUD
- Agregações
- Camadas da API
- Validação
- Testes
- Autenticação
- Integração com API externas
- Criação de imagens e containers Docker
- Implantação

# Ambiente de desenvolvimento

# Modelagem de dados

<details>
  <summary>
    <b>
      Domínio do Problema
    </b>
  </summary>

Sistema de classificação online de alunos de um curso específico.

> O domínio do problema (ou espaço do problema) é um termo que se refere a todas
> as informações que definem o problema e restringem a solução (as restrições
> fazem parte do problema). Ao entender o domínio do problema, a forma a
> estrutura do modelo de dados devem ficar claras.

Para esse estudo, definimos que teremos as seguintes entidades\*:

- **User**: Uma pessoa com uma conta. Um usuário pode ser um professor ou um
  aluno. Um mesmo usuário que é professor de um curso, por exemplo, pode ser um
  aluno em outro curso.
- **Course**: Um curso que pode ter um ou mais professores e alunos, como um ou
  mais testes de verificação de aprendizagem.
- **Tests**: Um curso pode ter muitos testes para avaliar a compreensão dos
  alunos. Os testes têm uma data e estão relacionados a um curso.
- **TestResult**: Cada teste pode ter vários registros e notas por aluno. Além
  disso, um `TestResult` também está relacionado ao professor que avaliou o
  teste.

> \*Uma entidade representa um objeto físico ou um conceito intangível.

</details>

<details>
  <summary>
    <b>
      Diagrama entidade relacionamento
    </b>
  </summary>

Considerando as entidades definidas acima, podemos perceber como elas se
relacionam:

- Um para muitos (1-N):

  - `Test` <--> `TestResult`
  - `Course` <--> `Test`
  - `User` <--> `TestResult` (através da FK `student`)
  - `User` <--> `TestResult` (através da FK `gradeId`)

- Muitos para muitos (M-N)
  - `User` <--> `Course` (através da tabela `CourseEnrollment` com duas FKs:
    `userId`, e `courseId`)

Para uma relação M-N, se faz necessário a criação de uma nova tabela, chamada de
_tabela de relacionamento (ou tabela JOIN)_. Uma tabela de relações é uma
prática de modelagem comum em SQL para representar relacionamentos entre
diferentes entidades. Em essência, significa que "uma relação mn é modelada como
duas relações 1-n no banco de dados".

Dessa maneira o sistema de avaliações terá as seguintes propriedades:

- Um único curso pode ter muitos usuários associados (alunos e professores).
- Um único usuário pode ser associado a vários cursos.

Com as cardinalidades das entidades compreendidas, podemos definir seus
atributos e representá-las graficamente.

Um Diagrama Entidade Relacionamento deste estudo pode ser acessado
[aqui.](https://drawsql.app/freelancer-51/diagrams/grading-system-online-course)

 [Voltar ao topo](#descrição)

</details>

# Prisma Schema

O `schema-prisma` é uma cofiguração declarativa que define as entidades que
serão migradas para o banco de dados. Essa migração é feita através do Prima
Migrate, que irá criar efetivamente as tabelas e suas colunas no banco dados.

<details>
  <summary>
    <b>
      Anatomia do arquivo prisma-esquema
    </b>
  </summary>

```javascript

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- `generator`

  - Gerador do arquivo usado por Prisma Client através quando
    `npx prisma generate` é executado.

- `datasource`

  - Define o tipo de banco ao qual você se irá se conectar. Essa conexão é feita
    por uma string de conexão. Com `env('DATABASE_URL)`, o Prisma lerá a URL do
    banco definida em uma variável de ambiente criada no arquivo `.env` criado
    na raiz do projeto o comando `prisma init` foi executado.

- `model`

```javascript

model User {
  id        Int    @default(autoincrement()) @id
  email     String @unique
  firstName String
  lastName  String
  social    Json?
}

```

O bloco de construção fundamental para do `prisma-schema` é o `model`. É nele
que declaramos as entidades, seus campos e suas relações.

Aqui está uma assinatura das entidades ignorando suas relações:

```javascript

model User {
  id        Int    @id @default(autoincrement())
  email     String @unique
  firstname String
  lastname  String
  socila    Json?
}

model Course {
  id            Int     @id @default(autoincrement())
  name          String
  courseDetails String?
}

model Test {
  id        Int      @id @default(autoincrement())
  updatedAt DateTime @updatedAt
  name      String // nome do teste
  date      DateTime // data do teste
}

model TestResult {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  result    Int
}

```

 [Voltar ao topo](#descrição)

</details>

<details>
<summary>
  <b>
    Definindo as relações
  </b>
  </summary>
   <details>
    <summary>
      <b>
        1 --- N:
      </b>
    </summary>

Para definirmos uma relação um-para-muitos, anotamos o atributo `@relation` do
lado que recebe a chave estrangeira (lado "muitos" da relação). Essa anotação
recebe como argumentos o campo que representa a chave estrangeira da tabela
subjacente e uma referência à chave primária desta tabela.

Para ilustrar, tomemos a relação entre `Test` e `TestResult`:

```javascript
model Test {
  id          Int          @id @default(autoincrement())
  updatedAt   DateTime     @updatedAt
  name        String
  date        DateTime
}

model TestResult {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  result    Int
}
```

O lado "muitos", `TestResult`, armazenará a chave estrangeira que estabelecerá o
relacionamento com o modelo `Test`. Adicionamos os campos `testId`, que tem o
tipo `Test` e o atributo `@relation` configurando que este campo faz referência
à chave primária de `Test`:

```javascript
model Test {
  id          Int          @id @default(autoincrement())
  updatedAt   DateTime     @updatedAt
  name        String
  date        DateTime
+ testResults TestResult[]
}

model TestResult {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  result    Int
+ test      Test     @relation(fields: [testId], references: [id])
+ testId    Int
}

```

Note que `testId` do tipo `Int` **representa o campo "real" do banco de dados
configurando a chave estrangeira.** Na
[documentação Prisma](https://www.prisma.io/docs/concepts/components/prisma-schema/relations#annotated-relation-fields-and-relation-scalar-fields)
este campo é chamado de "escalar" ou campo de "relação escalar".

O campo `test` do tipo `Test` e `testResult` do tipo `TestResult[]` são chamados
de "campos de relação". O atributo `@relation` mapeia a relação escalar `testId`
para o campo `id` que é a chave primária do modelo `Test` e `testResult` indica
que um array armazenará os resultados de queries futuras.

Ambos, `test` e `testResult` afetam como as relações são afetadas
programaticamente com Prisma Client, mas **não representam colunas no banco de
dados**.

 [Voltar ao topo](#descrição)

  </details>
</details>
