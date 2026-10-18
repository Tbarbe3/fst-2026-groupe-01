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
        },
      }),
      signal: AbortSignal.timeout(req.timeoutMs ?? 60_000),
    })
  } catch (error) {
    throw new GeminiError(`Gemini injoignable : ${(error as Error).message}`)
  }

  if (!response.ok) {
    throw new GeminiError(`Gemini a répondu ${response.status}`, response.status)
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
