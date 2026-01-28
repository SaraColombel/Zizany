import "dotenv/config";
import { prisma } from "@/infrastructure/prisma/prisma.client";

async function main() {
  const users = await prisma.user.createMany({
    data: [
      {
        id: 0,
        email: "sara.colombel@epitech.eu",
        password: "sara",
        username: "sarac",
      },
      {
        id: 1,
        email: "mathieu.vergez@epitech.eu",
        password: "mathieu",
        username: "mathieuv",
      },
      {
        id: 2,
        email: "jeremy.boubee@epitech.eu",
        password: "jeremy",
        username: "jeremyb",
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
