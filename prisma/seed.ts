import "dotenv/config";
import { prisma } from "@/infrastructure/prisma/prisma.client";

async function main() {
  const users = await prisma.users.createMany({
    data: [
      {
        email: "sara.colombel@epitech.eu",
        password: "sara",
        username: "sarac",
      },
      {
        email: "mathieu.vergez@epitech.eu",
        password: "mathieu",
        username: "mathieuv",
      },
      {
        email: "jeremy.boubee@epitech.eu",
        password: "jeremy",
        username: "jeremyb",
      },
    ],
    skipDuplicates: true,
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
    skipDuplicates: true,
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
