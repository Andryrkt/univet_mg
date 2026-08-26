import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Crée uniquement le compte admin (sans les données de démonstration du seed
// complet) — destiné à être exécuté en production à chaque déploiement.
// Idempotent : ne fait rien si un utilisateur existe déjà pour cet email.
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@univet.mg";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Un utilisateur existe déjà pour ${email}, création admin ignorée.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, passwordHash, name: "Administrateur", role: Role.ADMIN },
  });
  console.log(`Compte admin créé : ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
