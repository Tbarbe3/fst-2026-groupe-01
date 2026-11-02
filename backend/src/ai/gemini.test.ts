import { describe, expect, it, vi } from 'vitest'

import { GeminiError, callGemini } from './gemini.js'

const request = (fetchImpl: typeof fetch) => ({
  apiKey: 'cle-secrete',
  model: 'gemini-2.5-flash',
  system: 'système',
  prompt: 'demande',
  schema: { type: 'OBJECT' },
  temperature: 0,
  fetchImpl,
})

const reply = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch

describe('callGemini', () => {
  it('renvoie le JSON produit par le modèle', async () => {
    const fetchImpl = reply({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] })
    await expect(callGemini(request(fetchImpl))).resolves.toEqual({ ok: true })
  })

  // Une clé dans l'URL finirait dans les journaux des proxys et du serveur.
  it('transmet la clé en en-tête et jamais dans l’URL', async () => {
    const fetchImpl = reply({ candidates: [{ content: { parts: [{ text: '{}' }] } }] })
    await callGemini(request(fetchImpl))
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0] as [string, RequestInit]
    expect(url).not.toContain('cle-secrete')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('cle-secrete')
  })

  it('lève sur une erreur HTTP', async () => {
    await expect(callGemini(request(reply({}, 429)))).rejects.toBeInstanceOf(GeminiError)
  })

  // Symptôme d'origine : un simple « Gemini a répondu 404 » cachait un modèle retiré.
  it('reprend le motif donné par Google dans l’erreur', async () => {
    const fetchImpl = reply({ error: { message: 'This model is no longer available' } }, 404)
    await expect(callGemini(request(fetchImpl))).rejects.toThrow(/404 : This model is no longer available/)
  })

  // Symptôme d'origine : près de 30 s de réflexion pour répondre « OK ».
  it('transmet le niveau de réflexion demandé', async () => {
    const fetchImpl = reply({ candidates: [{ content: { parts: [{ text: '{}' }] } }] })
    await callGemini({ ...request(fetchImpl), thinkingLevel: 'minimal' })
    const body = JSON.parse(vi.mocked(fetchImpl).mock.calls[0]![1]!.body as string)
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'minimal' })
  })

  it('n’envoie aucun réglage de réflexion par défaut', async () => {
    const fetchImpl = reply({ candidates: [{ content: { parts: [{ text: '{}' }] } }] })
    await callGemini(request(fetchImpl))
    const body = JSON.parse(vi.mocked(fetchImpl).mock.calls[0]![1]!.body as string)
    expect(body.generationConfig.thinkingConfig).toBeUndefined()
  })

  it('lève sur une réponse vide', async () => {
    await expect(
      callGemini(request(reply({ candidates: [{ finishReason: 'SAFETY' }] }))),
    ).rejects.toThrow(/SAFETY/)
  })

  it('lève sur un texte qui n’est pas du JSON', async () => {
    const fetchImpl = reply({ candidates: [{ content: { parts: [{ text: 'Voici :' }] } }] })
    await expect(callGemini(request(fetchImpl))).rejects.toThrow(/JSON/)
  })
})
