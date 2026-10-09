// Plafond contre la force brute ; 20/minute laisse place aux fautes de
// saisie. Module séparé pour que les tests l'importent sans charger
// `app.ts`, qui exigerait une base joignable.
export const AUTH_RATE_LIMIT = { max: 20, timeWindow: '1 minute' } as const
