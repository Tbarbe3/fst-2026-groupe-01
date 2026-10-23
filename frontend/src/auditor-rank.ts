/** Note minimale pour qu'une revue compte dans la progression : une revue bâclée ne fait pas monter. */
export const PASSING_SCORE = 50

const RANKS = [
  { min: 0, title: 'dashboard.rankNovice', desc: 'dashboard.rankNoviceDesc' },
  { min: 5, title: 'dashboard.rankApprentice', desc: 'dashboard.rankApprenticeDesc' },
  { min: 10, title: 'dashboard.rankConfirmed', desc: 'dashboard.rankConfirmedDesc' },
  { min: 20, title: 'dashboard.rankSenior', desc: 'dashboard.rankSeniorDesc' },
] as const

/** Rang selon le nombre de revues réussies ; la barre mesure l'avancée vers le rang suivant. */
export function getAuditorRank(
  scores: number[],
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  const count = scores.filter((score) => score >= PASSING_SCORE).length
  const index = RANKS.filter((rank) => count >= rank.min).length - 1
  const rank = RANKS[index]!
  const next = RANKS[index + 1]
  if (!next) {
    const avg = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    return { title: t(rank.title), progress: 100, desc: t(rank.desc, { avg }) }
  }

  const remaining = next.min - count
  return {
    title: t(rank.title),
    progress: Math.round(((count - rank.min) / (next.min - rank.min)) * 100),
    desc: t(rank.desc, { count: remaining, s: remaining > 1 ? 's' : '' }),
  }
}
