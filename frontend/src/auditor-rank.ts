const RANKS = [
  { min: 0, title: 'dashboard.rankNovice', desc: 'dashboard.rankNoviceDesc' },
  { min: 5, title: 'dashboard.rankApprentice', desc: 'dashboard.rankApprenticeDesc' },
  { min: 10, title: 'dashboard.rankConfirmed', desc: 'dashboard.rankConfirmedDesc' },
  { min: 20, title: 'dashboard.rankSenior', desc: 'dashboard.rankSeniorDesc' },
] as const

/** Rang selon le nombre de revues terminées ; la barre mesure l'avancée vers le rang suivant. */
export function getAuditorRank(
  count: number,
  avgScore: number,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  const index = RANKS.filter((rank) => count >= rank.min).length - 1
  const rank = RANKS[index]!
  const next = RANKS[index + 1]
  if (!next) return { title: t(rank.title), progress: 100, desc: t(rank.desc, { avg: avgScore }) }

  const remaining = next.min - count
  return {
    title: t(rank.title),
    progress: Math.round(((count - rank.min) / (next.min - rank.min)) * 100),
    desc: t(rank.desc, { count: remaining, s: remaining > 1 ? 's' : '' }),
  }
}
