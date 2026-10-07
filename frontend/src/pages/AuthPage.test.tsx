import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authClientMock, sessionAbsent } from '@/tests/session'
import AuthPage from './AuthPage'

vi.mock('../auth', () => ({ authClient: authClientMock }))

function renderAuth(mode: 'login' | 'register') {
  const router = createMemoryRouter(
    [
      { path: '/', element: <AuthPage mode={mode} /> },
      { path: '/dashboard', element: <p>Tableau de bord</p> },
    ],
    { initialEntries: ['/'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionAbsent()
  })

  describe('connexion', () => {
    it('ne demande ni pseudonyme ni confirmation', () => {
      renderAuth('login')
      expect(screen.queryByLabelText('Pseudonyme')).not.toBeInTheDocument()
      expect(
        screen.queryByLabelText('Confirmez le mot de passe'),
      ).not.toBeInTheDocument()
    })

    it('refuse une adresse vide', async () => {
      const user = userEvent.setup()
      renderAuth('login')

      await user.click(screen.getByRole('button', { name: 'Se connecter' }))

      expect(screen.getByRole('alert')).toHaveTextContent(
        "L'adresse e-mail est requise.",
      )
      expect(authClientMock.signIn.email).not.toHaveBeenCalled()
    })

    it('refuse un mot de passe trop court sans appeler le serveur', async () => {
      const user = userEvent.setup()
      renderAuth('login')

      await user.type(screen.getByLabelText('Adresse e-mail'), 'a@b.fr')
      await user.type(screen.getByLabelText('Mot de passe'), 'court')
      await user.click(screen.getByRole('button', { name: 'Se connecter' }))

      expect(screen.getByRole('alert')).toHaveTextContent('au moins 8 caractères')
      expect(authClientMock.signIn.email).not.toHaveBeenCalled()
    })

    // Distinguer « compte inconnu » de « mot de passe incorrect » révélerait
    // quelles adresses sont inscrites.
    it("n'indique pas si le compte existe en cas d'échec", async () => {
      const user = userEvent.setup()
      authClientMock.signIn.email.mockResolvedValue({
        error: { message: 'User not found' },
      })
      renderAuth('login')

      await user.type(screen.getByLabelText('Adresse e-mail'), 'a@b.fr')
      await user.type(screen.getByLabelText('Mot de passe'), 'motdepasse')
      await user.click(screen.getByRole('button', { name: 'Se connecter' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Adresse e-mail ou mot de passe incorrect.')
      expect(alert).not.toHaveTextContent('User not found')
    })

    it('redirige vers le tableau de bord après succès', async () => {
      const user = userEvent.setup()
      authClientMock.signIn.email.mockResolvedValue({ error: null })
      renderAuth('login')

      await user.type(screen.getByLabelText('Adresse e-mail'), 'a@b.fr')
      await user.type(screen.getByLabelText('Mot de passe'), 'motdepasse')
      await user.click(screen.getByRole('button', { name: 'Se connecter' }))

      expect(await screen.findByText('Tableau de bord')).toBeInTheDocument()
    })
  })

  describe('inscription', () => {
    it('demande pseudonyme, adresse, mot de passe et confirmation', () => {
      renderAuth('register')
      expect(screen.getByLabelText('Pseudonyme')).toBeInTheDocument()
      expect(screen.getByLabelText('Adresse e-mail')).toBeInTheDocument()
      expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
      expect(
        screen.getByLabelText('Confirmez le mot de passe'),
      ).toBeInTheDocument()
    })

    it('refuse deux mots de passe différents', async () => {
      const user = userEvent.setup()
      renderAuth('register')

      await user.type(screen.getByLabelText('Pseudonyme'), 'thomas')
      await user.type(screen.getByLabelText('Adresse e-mail'), 'a@b.fr')
      await user.type(screen.getByLabelText('Mot de passe'), 'motdepasse')
      await user.type(
        screen.getByLabelText('Confirmez le mot de passe'),
        'motdepasseX',
      )
      await user.click(screen.getByRole('button', { name: "S'inscrire" }))

      expect(screen.getByRole('alert')).toHaveTextContent(
        'ne correspondent pas',
      )
      expect(authClientMock.signUp.email).not.toHaveBeenCalled()
    })

    it('transmet le pseudonyme comme nom du compte', async () => {
      const user = userEvent.setup()
      authClientMock.signUp.email.mockResolvedValue({ error: null })
      renderAuth('register')

      await user.type(screen.getByLabelText('Pseudonyme'), 'thomas')
      await user.type(screen.getByLabelText('Adresse e-mail'), 'a@b.fr')
      await user.type(screen.getByLabelText('Mot de passe'), 'motdepasse')
      await user.type(
        screen.getByLabelText('Confirmez le mot de passe'),
        'motdepasse',
      )
      await user.click(screen.getByRole('button', { name: "S'inscrire" }))

      expect(authClientMock.signUp.email).toHaveBeenCalledWith({
        name: 'thomas',
        email: 'a@b.fr',
        password: 'motdepasse',
      })
    })
  })

  // L'emplacement du message est réservé en CSS pour que son apparition ne
  // déplace pas le bouton ; encore faut-il que le conteneur existe toujours.
  it("réserve l'emplacement du message même sans erreur", () => {
    const { container } = renderAuth('login')
    expect(container.querySelector('.form-feedback')).toBeInTheDocument()
  })
})
