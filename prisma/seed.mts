import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await hash("123456", 12);

  const joao = await prisma.user.upsert({
    where: { email: "joao@tiffy.com" },
    update: {},
    create: {
      name: "Joao Silva",
      username: "joaosilva",
      email: "joao@tiffy.com",
      password,
      bio: "Buscando alguem especial",
      gender: "MALE",
      role: "USER",
      coins: 500,
      online: true,
    },
  });

  const maria = await prisma.user.upsert({
    where: { email: "maria@tiffy.com" },
    update: {},
    create: {
      name: "Maria Santos",
      username: "mariasantos",
      email: "maria@tiffy.com",
      password,
      bio: "Criadora de conteudo | Amo viajar",
      gender: "FEMALE",
      role: "CREATOR",
      coins: 1200,
      online: true,
    },
  });

  const ana = await prisma.user.upsert({
    where: { email: "ana@tiffy.com" },
    update: {},
    create: {
      name: "Ana Oliveira",
      username: "anaoliveira",
      email: "ana@tiffy.com",
      password,
      bio: "Modelo e Influencer",
      gender: "FEMALE",
      role: "CREATOR",
      coins: 800,
      online: false,
    },
  });

  const pedro = await prisma.user.upsert({
    where: { email: "pedro@tiffy.com" },
    update: {},
    create: {
      name: "Pedro Costa",
      username: "pedrocosta",
      email: "pedro@tiffy.com",
      password,
      bio: "Empresario | Sao Paulo",
      gender: "MALE",
      role: "USER",
      coins: 300,
      online: false,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@tiffy.com" },
    update: {},
    create: {
      name: "Admin Tiffy",
      username: "admin",
      email: "admin@tiffy.com",
      password,
      bio: "Administrador da plataforma",
      gender: "MALE",
      role: "ADMIN",
      coins: 99999,
      online: true,
      verified: true,
    },
  });

  const videos = await Promise.all([
    prisma.video.create({
      data: { url: "/uploads/sample1.mp4", caption: "Dia lindo na praia!", duration: 15, views: 234, userId: maria.id },
    }),
    prisma.video.create({
      data: { url: "/uploads/sample2.mp4", caption: "Look do dia", duration: 12, views: 567, userId: ana.id },
    }),
    prisma.video.create({
      data: { url: "/uploads/sample3.mp4", caption: "Viagem incrivel!", duration: 15, views: 891, userId: maria.id },
    }),
  ]);

  await prisma.like.createMany({
    data: [
      { userId: joao.id, videoId: videos[0].id },
      { userId: joao.id, videoId: videos[1].id },
      { userId: pedro.id, videoId: videos[0].id },
      { userId: pedro.id, videoId: videos[2].id },
    ],
  });

  await prisma.message.createMany({
    data: [
      { content: "Oi Maria, adorei seu video!", senderId: joao.id, receiverId: maria.id, cost: 5 },
      { content: "Obrigada Joao!", senderId: maria.id, receiverId: joao.id, cost: 0 },
      { content: "Quer sair qualquer dia?", senderId: joao.id, receiverId: maria.id, cost: 5 },
    ],
  });

  await prisma.transaction.createMany({
    data: [
      { userId: joao.id, type: "PURCHASE", amount: 500, description: "Compra de 500 moedas" },
      { userId: joao.id, type: "SPENT", amount: -5, description: "Mensagem para Maria Santos" },
      { userId: maria.id, type: "EARNED", amount: 5, description: "Mensagem recebida de Joao Silva" },
    ],
  });

  await prisma.gift.create({
    data: { senderId: joao.id, receiverId: maria.id, type: "ROSE", value: 10 },
  });

  console.log("Seed completed!");
  console.log("Users: joao@tiffy.com / maria@tiffy.com / ana@tiffy.com / pedro@tiffy.com / admin@tiffy.com (password: 123456)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
