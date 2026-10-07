/*
 * Les routes d'authentification sont la cible naturelle d'une attaque par
 * force brute : sans plafond, un attaquant essaie des milliers de mots de
 * passe par minute. 20 requêtes par minute et par IP laissent largement
 * place aux erreurs de saisie légitimes.
 *
 * Déclaré dans son propre module pour que les tests puissent l'importer sans
 * charger `app.ts`, qui exigerait une base de données joignable.
 */
export const AUTH_RATE_LIMIT = { max: 20, timeWindow: '1 minute' } as const
