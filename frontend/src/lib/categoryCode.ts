const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function lettersOnly(text: string): string {
  return text
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

// Génère un code de catégorie à 3 lettres unique à partir d'un nom, pour la
// création à la volée depuis le formulaire produit (les codes créés via la
// page Catégories restent saisis manuellement).
export function generateCategoryCode(name: string, existingCodes: Iterable<string>): string {
  const used = new Set(Array.from(existingCodes, (c) => c.toUpperCase()));
  const words = name
    .split(/\s+/)
    .map(lettersOnly)
    .filter(Boolean);
  const letters = lettersOnly(name);

  const candidates: string[] = [];

  if (words.length >= 3) {
    candidates.push(words[0][0] + words[1][0] + words[2][0]);
  } else if (words.length === 2) {
    candidates.push(words[0].slice(0, 2) + words[1][0]);
    candidates.push(words[0][0] + words[1].slice(0, 2));
  }

  for (let start = 0; start + 3 <= letters.length; start++) {
    candidates.push(letters.slice(start, start + 3));
  }

  if (letters.length > 0 && letters.length < 3) {
    candidates.push(letters.padEnd(3, "X"));
  }

  for (const candidate of candidates) {
    if (candidate.length === 3 && !used.has(candidate)) return candidate;
  }

  for (const a of ALPHABET) {
    for (const b of ALPHABET) {
      for (const c of ALPHABET) {
        const code = `${a}${b}${c}`;
        if (!used.has(code)) return code;
      }
    }
  }
  throw new Error("Impossible de générer un code de catégorie unique");
}
