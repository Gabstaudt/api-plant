Para rodar o projeto do gero api:

1. Instalar as dependências
npm install

2. Subir o banco - postgres via docker
docker compose up -d

-> lembrar de abrir o docker 

3. Aplicar o schema prisma
npx prisma db push
e
quando criarmos migrações: npx prisma migrate dev --name init

4. Criar o seed de usuários
npm run seed
ou
npm run seed:users

que irá criar: 
admin@plant.com / 12345678 (ADMIN)
usuario@plant.com / 12345678 (VIEWER)

5. subir a api
npm run start:dev


antes de tudo, criar o .env colando o codigo abaixo

DATABASE_URL="postgresql://plantdbuser:plantpassword@localhost:5445/plant_db?schema=public"
JWT_SECRET="segredo123"
PORT=3001
NODE_ENV=development


6. Erros possíveis
erro de conexão DB:
confirmar se docker compose up -d está rodando e a porta 5445 está livre

erro de prisma com tabela inexistente:
npx prisma db push 
ou
npx prisma migrate dev --name init

