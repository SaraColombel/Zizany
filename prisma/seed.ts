import "dotenv/config";
import { prisma } from "@/infrastructure/persistence/prisma/prisma.client";
import { BcryptHasher } from "@/infrastructure/security/bcrypt_hasher";

const hasher = new BcryptHasher();

async function main() {
  const users = await prisma.users.createMany({
    data: [
      {
        email: "sara.colombel@epitech.eu",
        password: await hasher.hash("sara"),
        username: "sarac",
      },
      {
        email: "mathieu.vergez@epitech.eu",
        password: await hasher.hash("mathieu"),
        username: "mathieuv",
      },
      {
        email: "jeremy.boubee@epitech.eu",
        password: await hasher.hash("jeremy"),
        username: "jeremyb",
      },
    ],
  });

  const servers = await prisma.servers.createMany({
    data: [
      {
        name: "Sara server",
        owner_id: 1,
      },
      {
        name: "Mathieu server",
        owner_id: 2,
      },
      {
        name: "Jeremy server",
        owner_id: 3,
      },
    ],
  });

  const roles = await prisma.roles.createMany({
    data: [
      {
        name: "Owner",
      },
      {
        name: "Admin",
      },
      {
        name: "Member",
      },
    ],
  });

  const memberships = await prisma.memberships.createMany({
    data: [
      // Owner
      {
        user_id: 1,
        server_id: 1,
        role_id: 1,
      },
      {
        user_id: 2,
        server_id: 2,
        role_id: 1,
      },
      {
        user_id: 3,
        server_id: 3,
        role_id: 1,
      },
      // Admin
      {
        user_id: 1,
        server_id: 2,
        role_id: 2,
      },
      {
        user_id: 2,
        server_id: 3,
        role_id: 2,
      },
      {
        user_id: 3,
        server_id: 1,
        role_id: 2,
      },
      // Member
      {
        user_id: 1,
        server_id: 3,
        role_id: 3,
      },
      {
        user_id: 2,
        server_id: 1,
        role_id: 3,
      },
      {
        user_id: 3,
        server_id: 2,
        role_id: 3,
      },
    ],
  });

  const channels = await prisma.channels.createMany({
    data: [
      {
        server_id: 1,
        name: "Sara channel",
      },
      {
        server_id: 2,
        name: "Mathieu channel",
      },
      {
        server_id: 3,
        name: "Jeremy channel",
      },
    ],
  });

  const messages = await prisma.messages.createMany({
    data: [
      {
        channel_id: 1,
        user_id: 2,
        content: "Bonjour sara",
      },
      {
        channel_id: 2,
        user_id: 3,
        content: "Bonjour mathieu",
      },
      {
        channel_id: 3,
        user_id: 1,
        content: "Bonjour jeremy",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
