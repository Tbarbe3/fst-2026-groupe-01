import { describe, expect, it } from 'vitest'

import { describeNetworkError } from './network-error'

describe('describeNetworkError', () => {
  // C'est l'erreur réelle que lève `fetch` quand l'API est injoignable :
  // un TypeError au message anglais du navigateur, jamais traduit.
  it('reconnaît un TypeError comme un échec réseau', () => {
    const message = describeNetworkError(new TypeError('Failed to fetch'))
    expect(message).toContain('Impossible de contacter le serveur')
  })

  it("ignore une erreur qui n'est pas un échec réseau", () => {
    expect(describeNetworkError(new Error('Invalid email'))).toBeNull()
  })

  it('ignore une valeur qui n’est pas une Error', () => {
    expect(describeNetworkError('texte quelconque')).toBeNull()
  })
})
