import { PrismaClient, Role, type Product } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@univet.mg";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Un utilisateur existe déjà pour ${email}, création admin ignorée.`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: { email, passwordHash, name: "Administrateur", role: Role.ADMIN },
  });
  console.log(`Compte admin créé : ${email} / ${password}`);
  return admin;
}

async function receivePurchaseOrder(
  adminId: string,
  supplierId: string,
  lines: { productId: string; quantity: number; unitPrice: number }[]
) {
  const order = await prisma.purchaseOrder.create({
    data: {
      supplierId,
      status: "RECEIVED",
      receivedAt: new Date(),
      createdById: adminId,
      items: {
        create: lines.map((l) => ({
          productId: l.productId,
          quantityOrdered: l.quantity,
          quantityReceived: l.quantity,
          unitPrice: l.unitPrice,
        })),
      },
    },
  });

  for (const line of lines) {
    await prisma.product.update({
      where: { id: line.productId },
      data: { stockQuantity: { increment: line.quantity } },
    });
    await prisma.stockMovement.create({
      data: {
        productId: line.productId,
        type: "PURCHASE_RECEPTION",
        quantity: line.quantity,
        referenceType: "PurchaseOrder",
        referenceId: order.id,
        createdById: adminId,
      },
    });
  }
}

async function seedSampleData(adminId: string) {
  const unitCount = await prisma.unit.count();
  if (unitCount > 0) {
    console.log("Des données existent déjà, données d'exemple ignorées.");
    return;
  }

  const [boite, comprime, flacon, sachet] = await Promise.all([
    prisma.unit.create({ data: { name: "Boîte", symbol: "bte" } }),
    prisma.unit.create({ data: { name: "Comprimé", symbol: "cp" } }),
    prisma.unit.create({ data: { name: "Flacon", symbol: "fl" } }),
    prisma.unit.create({ data: { name: "Sachet", symbol: "sach" } }),
  ]);

  const [medicament, antiparasitaire, alimentation, accessoire] = await Promise.all([
    prisma.category.create({ data: { name: "Médicament", code: "MED" } }),
    prisma.category.create({ data: { name: "Antiparasitaire", code: "ANT" } }),
    prisma.category.create({ data: { name: "Alimentation", code: "ALI" } }),
    prisma.category.create({ data: { name: "Accessoire", code: "ACC" } }),
  ]);

  const [vetopharma, agrivet, zooNutrition] = await Promise.all([
    prisma.supplier.create({
      data: {
        name: "Vetopharma Madagascar",
        contactName: "Rakoto Hery",
        phone: "034 12 345 67",
        email: "contact@vetopharma.mg",
      },
    }),
    prisma.supplier.create({
      data: { name: "Agrivet Import", contactName: "Rasoanaivo Lala", phone: "033 98 765 43" },
    }),
    prisma.supplier.create({
      data: { name: "Zoo Nutrition SARL", contactName: "Randria Fy", phone: "032 11 222 33" },
    }),
  ]);

  const [amoxicilline, serumPhysio, vaccinRage, vermifuge, antipuce, collier, croquettesChien, croquettesChat] =
    await Promise.all([
      prisma.product.create({
        data: { name: "Amoxicilline 500mg", categoryId: medicament.id, unitId: comprime.id, purchasePrice: 300, sellingPrice: 600, alertThreshold: 50 },
      }),
      prisma.product.create({
        data: { name: "Sérum physiologique", categoryId: medicament.id, unitId: flacon.id, purchasePrice: 1500, sellingPrice: 3000, alertThreshold: 10 },
      }),
      prisma.product.create({
        data: { name: "Vaccin antirabique", categoryId: medicament.id, unitId: flacon.id, purchasePrice: 3500, sellingPrice: 7000, alertThreshold: 10 },
      }),
      prisma.product.create({
        data: { name: "Vermifuge chien 10kg", categoryId: antiparasitaire.id, unitId: comprime.id, purchasePrice: 2500, sellingPrice: 4500, alertThreshold: 10 },
      }),
      prisma.product.create({
        data: { name: "Antipuce spot-on chat", categoryId: antiparasitaire.id, unitId: flacon.id, purchasePrice: 8000, sellingPrice: 14000, alertThreshold: 5 },
      }),
      prisma.product.create({
        data: { name: "Collier anti-puces", categoryId: accessoire.id, unitId: boite.id, purchasePrice: 4000, sellingPrice: 8000, alertThreshold: 5 },
      }),
      prisma.product.create({
        data: { name: "Croquettes chien adulte 3kg", categoryId: alimentation.id, unitId: sachet.id, purchasePrice: 15000, sellingPrice: 25000, alertThreshold: 5 },
      }),
      prisma.product.create({
        data: { name: "Croquettes chat stérilisé 1.5kg", categoryId: alimentation.id, unitId: sachet.id, purchasePrice: 9000, sellingPrice: 16000, alertThreshold: 5 },
      }),
    ]);

  await receivePurchaseOrder(adminId, vetopharma.id, [
    { productId: amoxicilline.id, quantity: 200, unitPrice: 300 },
    { productId: serumPhysio.id, quantity: 50, unitPrice: 1500 },
    { productId: vaccinRage.id, quantity: 30, unitPrice: 3500 },
  ]);

  await receivePurchaseOrder(adminId, agrivet.id, [
    { productId: vermifuge.id, quantity: 40, unitPrice: 2500 },
    { productId: antipuce.id, quantity: 25, unitPrice: 8000 },
    { productId: collier.id, quantity: 30, unitPrice: 4000 },
  ]);

  await receivePurchaseOrder(adminId, zooNutrition.id, [
    { productId: croquettesChien.id, quantity: 20, unitPrice: 15000 },
    { productId: croquettesChat.id, quantity: 20, unitPrice: 9000 },
  ]);

  const rakoto = await prisma.client.create({
    data: {
      name: "Rakoto Jean",
      phone: "034 11 222 33",
      animals: { create: [{ name: "Rex", species: "Chien", breed: "Labrador" }] },
    },
  });

  await prisma.client.create({
    data: {
      name: "Rasoamanana Voahangy",
      phone: "033 44 555 66",
      animals: {
        create: [
          { name: "Mimi", species: "Chat", breed: "Européen" },
          { name: "Fara", species: "Chat", breed: "Siamois" },
        ],
      },
    },
  });

  await prisma.client.create({
    data: {
      name: "Andrianina Paul",
      phone: "032 77 888 99",
      animals: { create: [{ name: "Tom", species: "Chien", breed: "Croisé" }] },
    },
  });

  await prisma.client.create({
    data: {
      name: "Ravaka Nivo",
      phone: "034 55 666 77",
      animals: { create: [{ name: "Bella", species: "Chat", breed: "Persan" }] },
    },
  });

  const saleLines: { product: Product; quantity: number; unitLabel: string }[] = [
    { product: vermifuge, quantity: 2, unitLabel: comprime.symbol ?? comprime.name },
    { product: collier, quantity: 1, unitLabel: boite.symbol ?? boite.name },
  ];
  const totalAmount = saleLines.reduce((sum, l) => sum + Number(l.product.sellingPrice) * l.quantity, 0);

  const sale = await prisma.sale.create({
    data: {
      clientId: rakoto.id,
      sellerId: adminId,
      totalAmount,
      items: {
        create: saleLines.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          unitLabel: l.unitLabel,
          unitPrice: l.product.sellingPrice,
          subtotal: Number(l.product.sellingPrice) * l.quantity,
        })),
      },
    },
  });

  for (const line of saleLines) {
    await prisma.product.update({
      where: { id: line.product.id },
      data: { stockQuantity: { decrement: line.quantity } },
    });
    await prisma.stockMovement.create({
      data: {
        productId: line.product.id,
        type: "SALE",
        quantity: -line.quantity,
        referenceType: "Sale",
        referenceId: sale.id,
        createdById: adminId,
      },
    });
  }

  console.log("Données d'exemple créées : unités, catégories, fournisseurs, produits, clients, commandes, vente.");
}

async function main() {
  const admin = await seedAdmin();
  await seedSampleData(admin.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
