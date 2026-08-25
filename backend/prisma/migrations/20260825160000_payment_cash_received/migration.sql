-- Payment : montant réellement remis par le client en espèces (nullable — non
-- renseigné si le paiement n'est pas en espèces ou si le montant exact a été donné).
ALTER TABLE "Payment" ADD COLUMN "cashReceived" DECIMAL(10,2);
