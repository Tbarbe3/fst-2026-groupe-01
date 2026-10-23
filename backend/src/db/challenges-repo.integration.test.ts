import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { MOCK_CATALOG } from '../ai/mock-catalog.js'
import { buildScenario } from '../ai/scenario-builder.js'
import type { GenerationParams } from '../ai/types.js'
import { createChallengesRepo, type ChallengesRepo } from './challenges-repo.js'

// Base jetable obligatoire : les tables sont vidées entre chaque test.
//   docker run -d --rm -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:17-alpine
//   TEST_DATABASE_URL=postgresql://postgres:test@127.0.0.1:55432/postgres npm test
const url = process.env['TEST_DATABASE_URL']
const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'sql', '001_schema.sql')

const PARAMS: GenerationParams = { language: 'typescript', difficulty: '3', category: 'security_owasp', locale: 'fr' }
const scenario = buildScenario(structuredClone(MOCK_CATALOG[0]!.scenario))

describe.skipIf(!url)('challenges-repo (PostgreSQL)', () => {
  let pool: pg.Pool
  let repo: ChallengesRepo

  const insertUser = (id: string) =>
    pool.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $1, $1 || '@test.fr', false, now(), now())`,
      [id],
    )
  const newScenario = (params = PARAMS) =>
    repo.insertScenario('u1', { scenario, params, source: 'seed', model: 'mock' })

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url })
    await pool.query(await readFile(SCHEMA, 'utf8'))
    repo = createChallengesRepo(pool)
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE "user", scenarios CASCADE')
    await insertUser('u1')
    await insertUser('u2')
  })

  afterAll(() => pool?.end())

  it('relit une tentative avec son scénario, sans perte', async () => {
    const attemptId = await repo.createAttempt('u1', await newScenario(), true)
    const attempt = await repo.getAttempt(attemptId, 'u1')

    expect(attempt).toMatchObject({ status: 'in_progress', isMystery: true, score: null })
    expect(attempt!.scenario).toMatchObject({ title: scenario.title, difficulty: '3', category: 'security_owasp' })
    expect(attempt!.scenario.files).toEqual(scenario.files)
    expect(attempt!.scenario.groundTruth).toEqual(scenario.groundTruth)
  })

  it('cache la tentative d’un autre joueur et ignore un identifiant mal formé', async () => {
    const attemptId = await repo.createAttempt('u1', await newScenario(), false)
    expect(await repo.getAttempt(attemptId, 'u2')).toBeNull()
    expect(await repo.getAttempt('pas-un-uuid', 'u1')).toBeNull()
  })

  it('ne propose que des scénarios non joués, dans la bonne langue', async () => {
    const fr = await newScenario()
    await newScenario({ ...PARAMS, locale: 'en' })

    expect(await repo.findUnplayedScenario('u2', PARAMS)).toBe(fr)
    await repo.createAttempt('u2', fr, false)
    expect(await repo.findUnplayedScenario('u2', PARAMS)).toBeNull()
  })

  it('enregistre le jugement une seule fois, puis l’affiche dans l’historique', async () => {
    const attemptId = await repo.createAttempt('u1', await newScenario(), false)
    const breakdown = { found: 1, total: 1, found_criticals: 1, total_criticals: 1, false_positives: 0, reasoning_quality: 80, detection: 60, explanation: 24, precision: 10 }
    const comments = [{ file_path: 'a.ts', line_number: 8, text: 'Signature', matched_issue_id: 'I1', clarity_score: 80, feedback: 'Bien vu' }]
    const judgement = { score: 94, breakdown, summary: 'Synthèse', judgedBy: 'ai' }

    expect(await repo.saveJudgement(attemptId, judgement, comments)).toBe(true)
    expect(await repo.saveJudgement(attemptId, judgement, comments)).toBe(false)

    const attempt = await repo.getAttempt(attemptId, 'u1')
    expect(attempt).toMatchObject({ status: 'submitted', score: 94, aiSummary: 'Synthèse', judgedBy: 'ai' })
    expect(attempt!.comments).toEqual([
      { file_path: 'a.ts', line_number: 8, text: 'Signature', matched_issue_id: 'I1', clarity_score: 80, feedback: 'Bien vu' },
    ])
    expect(await repo.listSubmitted('u1')).toEqual([
      expect.objectContaining({ id: attemptId, score: 94, difficulty: '3', category: 'security_owasp' }),
    ])
  })

  it('liste les parties à reprendre, sans dévoiler celles en mode Mystère', async () => {
    const mystery = await repo.createAttempt('u1', await newScenario(), true)
    const normal = await repo.createAttempt('u1', await newScenario(), false)

    const list = await repo.listInProgress('u1')
    expect(list.map((a) => a.id).sort()).toEqual([mystery, normal].sort())
    expect(list.find((a) => a.id === mystery)).toMatchObject({ isMystery: true, difficulty: null, category: null })
    expect(list.find((a) => a.id === normal)).toMatchObject({ isMystery: false, difficulty: '3', category: 'security_owasp' })
    expect(await repo.listInProgress('u2')).toEqual([])

    const breakdown = { found: 0, total: 1, found_criticals: 0, total_criticals: 1, false_positives: 0, reasoning_quality: 0, detection: 0, explanation: 0, precision: 0 }
    await repo.saveJudgement(normal, { score: 0, breakdown, summary: 's', judgedBy: 'ai' }, [])
    expect((await repo.listInProgress('u1')).map((a) => a.id)).toEqual([mystery])
  })

  it('supprime les parties d’un compte supprimé mais garde ses scénarios', async () => {
    const scenarioId = await newScenario()
    await repo.createAttempt('u1', scenarioId, false)
    await pool.query('DELETE FROM "user" WHERE id = $1', ['u1'])

    const { rows } = await pool.query('SELECT created_by_user_id FROM scenarios WHERE id = $1', [scenarioId])
    expect(rows).toEqual([{ created_by_user_id: null }])
    expect((await pool.query('SELECT 1 FROM review_attempts')).rowCount).toBe(0)
  })
})
