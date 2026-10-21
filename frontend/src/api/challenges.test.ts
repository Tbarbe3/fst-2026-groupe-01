import { afterEach, describe, expect, it, vi } from 'vitest'

import { applyLocaleToDocument } from '@/i18n'
import { ApiError, challengesApi } from './challenges'

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('challengesApi', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('envoie les paramètres du challenge en JSON', async () => {
    const fetchMock = mockFetch(201, { attemptId: 'a1' })
    const body = { language: 'typescript', difficulty: '3', category: 'security_owasp' }

    await expect(challengesApi.create(body)).resolves.toEqual({ attemptId: 'a1' })
    expect(fetchMock).toHaveBeenCalledWith('/api/challenges', {
      method: 'POST',
      body: JSON.stringify({ ...body, locale: 'fr' }),
      headers: { 'content-type': 'application/json' },
    })
  })

  it('encode l’identifiant de tentative dans l’URL', async () => {
    const fetchMock = mockFetch(200, {})
    await challengesApi.get('a/b')
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/attempts/a%2Fb')
  })

  it('relaie le message d’une erreur 4xx', async () => {
    mockFetch(409, { message: 'Tentative déjà soumise.' })
    await expect(challengesApi.submit('a1', [])).rejects.toEqual(
      new ApiError('Tentative déjà soumise.', 409),
    )
  })

  it('masque le détail d’une erreur 5xx', async () => {
    mockFetch(500, { message: 'stack trace interne' })
    await expect(challengesApi.history()).rejects.toThrow(/Le serveur a rencontré une erreur/)
  })
})

describe('traduction des erreurs de l’API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('traduit le code d’erreur plutôt que le message brut', async () => {
    mockFetch(409, { code: 'ALREADY_SUBMITTED', message: 'Cette revue a déjà été soumise.' })
    await expect(challengesApi.submit('a1', [])).rejects.toThrow('Cette revue a déjà été soumise.')
  })

  it('explique la limite de générations atteinte', async () => {
    mockFetch(429, { message: 'Rate limit exceeded, retry in 1 hour' })
    await expect(challengesApi.create({ mystery: true })).rejects.toThrow(/Trop de challenges/)
  })
})

describe('langue des contenus générés', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    applyLocaleToDocument('fr')
  })

  it('transmet la langue de l’interface à la création et à la soumission', async () => {
    applyLocaleToDocument('en')
    const fetchMock = mockFetch(200, { attemptId: 'a1' })

    await challengesApi.create({ mystery: true })
    await challengesApi.submit('a1', [])

    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body))
    expect(bodies).toEqual([
      { mystery: true, locale: 'en' },
      { comments: [], locale: 'en' },
    ])
  })
})
