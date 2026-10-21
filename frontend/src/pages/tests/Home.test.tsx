import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authClientMock, sessionAbsent, sessionActive } from '@/tests/session.ts'
import SiteLayout from '@/components/SiteLayout.tsx'
import { I18nProvider } from '@/i18n'
import Home from '../Home.tsx'

vi.mock('../../auth', () => ({ authClient: authClientMock }))

function renderHome() {
  const router = createMemoryRouter(
    [
      // Navigation et pied de page vivent dans SiteLayout, plus dans Home.
      { element: <SiteLayout />, children: [{ path: '/', element: <Home /> }] },
      { path: '/login', element: <p>Page Connexion</p> },
      { path: '/register', element: <p>Page Inscription</p> },
      { path: '/dashboard', element: <p>Page Dashboard</p> },
    ],
    { initialEntries: ['/'] },
  )
  return render(
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>,
  )
}

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.documentElement.removeAttribute('lang')
    sessionAbsent()
  })

  describe('visiteur non connecté', () => {
    it('affiche le titre principal et la marque Code How?', () => {
      renderHome()
      expect(
        screen.getByRole('heading', { level: 1, name: /Maîtrisez la revue de code/i }),
      ).toBeInTheDocument()
      expect(screen.getAllByText('Code How?').length).toBeGreaterThan(0)
    })

    it('propose les boutons de connexion et d’inscription vers les pages dédiées', () => {
      renderHome()
      const loginLinks = screen.getAllByRole('link', { name: /Se connecter/i })
      expect(loginLinks.length).toBeGreaterThan(0)
      expect(loginLinks[0]).toHaveAttribute('href', '/login')

      const registerLinks = screen.getAllByRole('link', { name: /S’inscrire|Créer un compte/i })
      expect(registerLinks.length).toBeGreaterThan(0)
      expect(registerLinks[0]).toHaveAttribute('href', '/register')
    })

    it('propose des boutons d’accès direct au Dashboard', () => {
      renderHome()
      const dashboardLinks = screen.getAllByRole('link', { name: /Dashboard|tableau de bord/i })
      expect(dashboardLinks.length).toBeGreaterThan(0)
      expect(dashboardLinks.some((l) => l.getAttribute('href') === '/dashboard')).toBe(true)
    })

    it('affiche la démo interactive de code et permet de changer de langage', async () => {
      const user = userEvent.setup()
      renderHome()

      // TypeScript est actif par défaut
      expect(screen.getByText('src/components/SearchBox.tsx')).toBeInTheDocument()

      // Cliquer sur le bouton Python
      const pythonTab = screen.getByRole('tab', { name: /Python/i })
      await user.click(pythonTab)

      expect(screen.getByText('backend/services/user_service.py')).toBeInTheDocument()
      expect(screen.getByText(/Injection SQL/i)).toBeInTheDocument()
    })

    it('permet de basculer entre l’anomalie et la solution corrigée', async () => {
      const user = userEvent.setup()
      renderHome()

      expect(screen.getByText(/Injection directe de l’entrée utilisateur/i)).toBeInTheDocument()

      // Basculer vers la solution attendue
      const solutionBtn = screen.getByRole('button', { name: /Solution attendue/i })
      await user.click(solutionBtn)

      expect(screen.getByText(/Échappement natif/i)).toBeInTheDocument()
    })

    it('permet de basculer toute la page en anglais via le bouton du header', async () => {
      const user = userEvent.setup()
      renderHome()

      const switchBtn = screen.getByRole('button', { name: 'Passer en anglais' })
      await user.click(switchBtn)

      expect(
        screen.getByRole('heading', { level: 1, name: /Master code review/i }),
      ).toBeInTheDocument()
      expect(screen.getAllByText('Code Demo').length).toBeGreaterThan(0)
      expect(screen.getAllByRole('link', { name: /Sign in/i }).length).toBeGreaterThan(0)
      expect(screen.getByText(/Direct injection of user input/i)).toBeInTheDocument()
    })
  })

  describe('visiteur connecté', () => {
    it('affiche l’identité et le pseudo de l’utilisateur avec un message de bienvenue', () => {
      sessionActive({ id: 'u1', name: 'Alice', email: 'alice@code.fr' })
      renderHome()

      expect(screen.getByRole('status')).toHaveTextContent('Alice')
      expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
      const dashboardLinks = screen.getAllByRole('link', {
        name: /Tableau de bord de Alice/i,
      })
      expect(dashboardLinks.length).toBeGreaterThan(0)
      expect(dashboardLinks[0]).toHaveAttribute('href', '/dashboard')
    })

    it('permet la déconnexion via le bouton de sortie', async () => {
      const user = userEvent.setup()
      sessionActive({ id: 'u1', name: 'Alice', email: 'alice@code.fr' })
      renderHome()

      const logoutBtns = screen.getAllByRole('button', { name: 'Se déconnecter' })
      expect(logoutBtns.length).toBeGreaterThan(0)
      await user.click(logoutBtns[0])

      expect(authClientMock.signOut).toHaveBeenCalled()
    })
  })
})
