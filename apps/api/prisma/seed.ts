import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Créer l'utilisateur admin s'il n'existe pas
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@maison-dalhias.fr' },
  });

  if (!existingAdmin) {
    // ⚠️ DEV ONLY - Ne pas utiliser en production
    // En production, créer l'admin via une migration ou un script sécurisé
    const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: 'admin@maison-dalhias.fr',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    console.log('Utilisateur admin créé: admin@maison-dalhias.fr');
  } else {
    console.log('Utilisateur admin déjà existant');
  }

  // Créer les settings par défaut s'ils n'existent pas
  const existingSettings = await prisma.settings.findUnique({
    where: { id: 'default' },
  });

  if (!existingSettings) {
    await prisma.settings.create({
      data: {
        id: 'default',
        defaultPricePerNight: new Prisma.Decimal(100),
      },
    });
    console.log('Settings par défaut créés');
  }

  // Vérifier si des saisons existent déjà
  const existingSeasons = await prisma.season.count();
  if (existingSeasons > 0) {
    console.log('Saisons déjà présentes, skip du seeding des saisons');
    return;
  }

  // Créer les saisons par défaut
  const seasons = await Promise.all([
    prisma.season.create({
      data: {
        name: 'Basse saison',
        pricePerNight: new Prisma.Decimal(80),
        color: '#10B981',
        order: 1,
      },
    }),
    prisma.season.create({
      data: {
        name: 'Moyenne saison',
        pricePerNight: new Prisma.Decimal(120),
        color: '#F59E0B',
        order: 2,
      },
    }),
    prisma.season.create({
      data: {
        name: 'Haute saison',
        pricePerNight: new Prisma.Decimal(150),
        color: '#F97316',
        order: 3,
      },
    }),
    prisma.season.create({
      data: {
        name: 'Très haute saison',
        pricePerNight: new Prisma.Decimal(180),
        color: '#EF4444',
        order: 4,
      },
    }),
  ]);

  console.log(`${String(seasons.length)} saisons créées`);

  const [basseSaison, moyenneSaison, hauteSaison, tresHauteSaison] = seasons;

  // Créer les plages de dates pour 2025
  const periods2025 = await Promise.all([
    prisma.datePeriod.create({
      data: {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-04-01'),
        year: 2025,
        seasonId: basseSaison.id,
      },
    }),
    prisma.datePeriod.create({
      data: {
        startDate: new Date('2025-04-01'),
        endDate: new Date('2025-07-01'),
        year: 2025,
        seasonId: moyenneSaison.id,
      },
    }),
    prisma.datePeriod.create({
      data: {
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-08-16'),
        year: 2025,
        seasonId: hauteSaison.id,
      },
    }),
    prisma.datePeriod.create({
      data: {
        startDate: new Date('2025-08-16'),
        endDate: new Date('2025-09-01'),
        year: 2025,
        seasonId: tresHauteSaison.id,
      },
    }),
    prisma.datePeriod.create({
      data: {
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-11-01'),
        year: 2025,
        seasonId: moyenneSaison.id,
      },
    }),
    prisma.datePeriod.create({
      data: {
        startDate: new Date('2025-11-01'),
        endDate: new Date('2026-01-01'),
        year: 2025,
        seasonId: basseSaison.id,
      },
    }),
  ]);

  console.log(`${String(periods2025.length)} plages de dates créées pour 2025`);

  console.log('Seeding terminé !');
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
