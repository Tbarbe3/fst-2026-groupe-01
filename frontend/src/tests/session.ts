import { vi } from 'vitest'

export interface FakeSession {
  user?: { id: string; name: string; email: string }
}

/**
 * Double d'`authClient`, pour piloter l'état de session sans serveur. À
 * déclarer au niveau du module : `vi.mock` est hissé avant les imports, un
 * appel dans un `it` serait sans effet.
 */
export const authClientMock = {
  useSession: vi.fn(),
  signOut: vi.fn(),
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
}

export function sessionPending() {
  authClientMock.useSession.mockReturnValue({ data: null, isPending: true })
}

export function sessionAbsent() {
  authClientMock.useSession.mockReturnValue({ data: null, isPending: false })
}

export function sessionActive(user?: FakeSession['user']) {
  authClientMock.useSession.mockReturnValue({
    data: {
      user: user ?? {
        id: 'u1',
        name: 'thomas',
        email: 'thomas@exemple.fr',
      },
    },
    isPending: false,
  })
}

/** Session reconnue mais sans utilisateur : la réponse serveur est non conforme. */
export function sessionWithoutUser() {
  authClientMock.useSession.mockReturnValue({
    data: {},
    isPending: false,
  })
}
