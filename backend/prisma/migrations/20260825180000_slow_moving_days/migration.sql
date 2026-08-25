-- ClinicSettings : fenêtre (en jours) utilisée pour détecter les produits sans vente récente
ALTER TABLE "ClinicSettings" ADD COLUMN "slowMovingDays" INTEGER NOT NULL DEFAULT 30;
