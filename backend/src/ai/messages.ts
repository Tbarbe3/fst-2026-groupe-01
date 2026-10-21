import type { Locale } from './types.js'

/** Textes produits par le serveur sans IA, dans la langue du joueur. */
export const MESSAGES = {
  fr: {
    approvedWithoutRemarks:
      'Tu as approuvé la pull request sans aucune remarque, alors qu’elle contenait des anomalies. C’est exactement le réflexe que cet exercice veut corriger.',
    heuristicSummary:
      'Analyse sémantique temporairement indisponible, résultat calculé d’après les lignes pointées.',
    heuristicMatched: 'Ligne correcte. La qualité de l’explication n’a pas pu être évaluée.',
    heuristicMissed: 'Aucune anomalie attendue à cet endroit.',
    noFeedback: 'Aucun retour détaillé pour ce commentaire.',
    mockOffTarget:
      'Cette ligne ne contient pas d’anomalie attendue. Remarque recevable en revue, mais hors du périmètre de l’exercice.',
    mockClear: (issue: string) => `Bien vu : ${issue} Ton explication couvre l’impact.`,
    mockVague: 'Bonne ligne, mais l’explication reste vague : précise la cause et la conséquence concrète.',
    mockSummary: (found: number, total: number) =>
      `[Mode simulé] Tu as repéré ${found} anomalie(s) sur ${total}. Ce retour est généré sans IA, pour tester l’interface.`,
  },
  en: {
    approvedWithoutRemarks:
      'You approved the pull request without any remark, although it contained flaws. That is exactly the reflex this exercise aims to fix.',
    heuristicSummary: 'Semantic analysis is temporarily unavailable; the result is based on the lines you pointed at.',
    heuristicMatched: 'Right line. The quality of the explanation could not be assessed.',
    heuristicMissed: 'No expected flaw at this location.',
    noFeedback: 'No detailed feedback for this comment.',
    mockOffTarget:
      'This line does not contain an expected flaw. A fair review remark, but outside the scope of the exercise.',
    mockClear: (issue: string) => `Well spotted: ${issue} Your explanation covers the impact.`,
    mockVague: 'Right line, but the explanation stays vague: state the cause and the concrete consequence.',
    mockSummary: (found: number, total: number) =>
      `[Simulated mode] You spotted ${found} flaw(s) out of ${total}. This feedback is generated without AI, to test the interface.`,
  },
} satisfies Record<Locale, unknown>
