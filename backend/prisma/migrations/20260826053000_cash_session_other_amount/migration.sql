-- CashSession : total des paiements "Autre" (non espèces) encaissés pendant la
-- session — purement informatif, n'entre jamais dans le calcul de l'écart.
ALTER TABLE "CashSession" ADD COLUMN "otherAmount" DECIMAL(10,2);
