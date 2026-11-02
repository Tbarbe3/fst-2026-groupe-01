const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export class GeminiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'GeminiError'
  }
}

export interface GeminiRequest {
  apiKey: string
  model: string
  system: string
  prompt: string
  schema: object
  temperature: number
  timeoutMs?: number
  /** Niveau de réflexion des modèles Gemini 3 ; absent : celui du modèle. */
  thinkingLevel?: string
  fetchImpl?: typeof fetch
}

/**
 * Appel REST direct plutôt que le SDK : un seul endpoint suffit, et cela
 * évite une dépendance de plus dans l'image.
 */
export async function callGemini(req: GeminiRequest): Promise<unknown> {
  const fetchImpl = req.fetchImpl ?? fetch
  let response: Response
  try {
    response = await fetchImpl(`${API_BASE}/${encodeURIComponent(req.model)}:generateContent`, {
      method: 'POST',
      // Clé dans un en-tête et non dans l'URL, qui finirait dans les journaux.
      headers: { 'content-type': 'application/json', 'x-goog-api-key': req.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
        generationConfig: {
          temperature: req.temperature,
          responseMimeType: 'application/json',
          responseSchema: req.schema,
          // Par défaut, un modèle Gemini 3 réfléchit longuement : près de 30 s
          // pour répondre « OK », au-delà du délai du juge.
          ...(req.thinkingLevel ? { thinkingConfig: { thinkingLevel: req.thinkingLevel } } : {}),
        },
      }),
      signal: AbortSignal.timeout(req.timeoutMs ?? 60_000),
    })
  } catch (error) {
    throw new GeminiError(`Gemini injoignable : ${(error as Error).message}`)
  }

  if (!response.ok) {
    // Le motif de Google (modèle retiré, quota…) est indispensable au diagnostic.
    const detail = await response
      .json()
      .then((b) => (b as { error?: { message?: string } }).error?.message ?? '')
      .catch(() => '')
    throw new GeminiError(
      `Gemini a répondu ${response.status}${detail ? ` : ${detail.slice(0, 300)}` : ''}`,
      response.status,
    )
  }

  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
  }
  const candidate = body.candidates?.[0]
  const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('')
  if (!text) {
    throw new GeminiError(`Réponse Gemini vide (${candidate?.finishReason ?? 'sans motif'})`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new GeminiError('Réponse Gemini qui n’est pas du JSON')
  }
}
