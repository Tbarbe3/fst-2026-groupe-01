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

  // `data-visible` pilote la transition de hauteur du CSS : à `false`, le
  // conteneur n'occupe aucune place, ce qui évite le vide réservé.
  describe("emplacement du message d'erreur", () => {
    it("n'occupe aucune place en l'absence d'erreur", () => {
      const { container } = renderAuth('login')
      const slot = container.querySelector('.form-feedback')

      expect(slot).toBeInTheDocument()
      expect(slot).toHaveAttribute('data-visible', 'false')
    })

    it("se déploie dès qu'une erreur apparaît", async () => {
      const user = userEvent.setup()
      const { container } = renderAuth('login')

      await user.click(screen.getByRole('button', { name: 'Se connecter' }))

      expect(container.querySelector('.form-feedback')).toHaveAttribute(
        'data-visible',
        'true',
      )
    })
  })

  // `/login` et `/register` rendent AuthPage à la même position de l'arbre :
  // React réutilise l'instance, donc l'état survit au changement de route.
  describe('changement de mode', () => {
    function renderWithNavigation(initial: 'login' | 'register') {
      const router = createMemoryRouter(
        [
          { path: '/login', element: <AuthPage mode="login" /> },
          { path: '/register', element: <AuthPage mode="register" /> },
        ],
        { initialEntries: [`/${initial}`] },
      )
      return render(<RouterProvider router={router} />)
    }

    it("n'affiche plus l'erreur de connexion sur le formulaire d'inscription", async () => {
      const user = userEvent.setup()
      renderWithNavigation('login')

      await user.click(screen.getByRole('button', { name: 'Se connecter' }))
      expect(screen.getByRole('alert')).toBeInTheDocument()

      await user.click(screen.getByRole('link', { name: "S'inscrire" }))

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByLabelText('Pseudonyme')).toBeInTheDocument()
    })

    it("n'affiche plus l'erreur d'inscription sur le formulaire de connexion", async () => {
      const user = userEvent.setup()
      renderWithNavigation('register')

      await user.click(screen.getByRole('button', { name: "S'inscrire" }))
      expect(screen.getByRole('alert')).toBeInTheDocument()

      await user.click(screen.getByRole('link', { name: 'Se connecter' }))

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it("conserve l'adresse saisie mais vide les mots de passe", async () => {
      const user = userEvent.setup()
      renderWithNavigation('login')

      await user.type(screen.getByLabelText('Adresse e-mail'), 'a@b.fr')
      await user.type(screen.getByLabelText('Mot de passe'), 'motdepasse')
      await user.click(screen.getByRole('link', { name: "S'inscrire" }))

      expect(screen.getByLabelText('Adresse e-mail')).toHaveValue('a@b.fr')
      expect(screen.getByLabelText('Mot de passe')).toHaveValue('')
    })
  })

  describe('mise en page', () => {
    it('place les champs sur deux colonnes à l’inscription', () => {
      const { container } = renderAuth('register')
      expect(container.querySelectorAll('.form-row')).toHaveLength(2)
      expect(container.querySelector('.auth-container-wide')).toBeInTheDocument()
    })

    it('garde une seule colonne à la connexion', () => {
      const { container } = renderAuth('login')
      expect(container.querySelectorAll('.form-row')).toHaveLength(0)
      expect(
        container.querySelector('.auth-container-wide'),
      ).not.toBeInTheDocument()
    })
  })

  describe('traduction des erreurs d’inscription', () => {
    const submitRegister = async (
      user: ReturnType<typeof userEvent.setup>,
    ) => {
      await user.type(screen.getByLabelText('Pseudonyme'), 'thomas')
      await user.type(screen.getByLabelText('Adresse e-mail'), 'a@b.fr')
      await user.type(screen.getByLabelText('Mot de passe'), 'motdepasse')
      await user.type(
        screen.getByLabelText('Confirmez le mot de passe'),
        'motdepasse',
      )
      await user.click(screen.getByRole('button', { name: "S'inscrire" }))
    }

    it('signale explicitement un compte déjà existant', async () => {
      const user = userEvent.setup()
      authClientMock.signUp.email.mockResolvedValue({
        error: { message: 'User already exists' },
      })
      renderAuth('register')

      await submitRegister(user)

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Un compte existe déjà avec cette adresse e-mail.',
      )
    })

    // Un message inconnu ne doit pas remonter tel quel : il est en anglais et
    // peut contenir des détails internes.
    it('ne laisse pas passer un message anglais inconnu', async () => {
      const user = userEvent.setup()
      authClientMock.signUp.email.mockResolvedValue({
        error: { message: 'Database connection pool exhausted' },
      })
      renderAuth('register')

      await submitRegister(user)

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Vérifiez les informations saisies.')
      expect(alert).not.toHaveTextContent('Database')
    })
  })
})
