import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authClientMock, sessionAbsent, sessionActive } from '@/tests/session.ts'
import { I18nProvider } from '@/i18n'
import SiteHeader from './SiteHeader'

vi.mock('../auth', () => ({ authClient: authClientMock }))

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '*', element: <SiteHeader /> }], {
    initialEntries: [path],
  })
  return render(
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>,
  )
}

describe('SiteHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.documentElement.removeAttribute('lang')
    sessionAbsent()
  })

  it('ouvre les paramètres du compte depuis la pastille utilisateur', async () => {
    sessionActive({ id: 'u1', name: 'Alice', email: 'alice@code.fr' })
    renderAt('/dashboard')

    await userEvent.click(screen.getByRole('button', { name: /Paramètres du compte de Alice/ }))
    expect(screen.getByText('Paramètres du Compte')).toBeInTheDocument()
  })

  it('montre langue et thème aux visiteurs seulement', () => {
    renderAt('/')
    expect(screen.getByRole('button', { name: 'Passer en anglais' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Passer en thème/ })).toBeInTheDocument()
  })

  it('remplace les réglages par la navigation de l’espace connecté', () => {
    sessionActive({ id: 'u1', name: 'Alice', email: 'alice@code.fr' })
    renderAt('/dashboard')

    expect(screen.queryByRole('button', { name: 'Passer en anglais' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Passer en thème/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Tableau de bord' })).toHaveClass('active')
  })

  it('supprime le compte après confirmation par mot de passe', async () => {
    sessionActive({ id: 'u1', name: 'Alice', email: 'alice@code.fr' })
    authClientMock.deleteUser.mockResolvedValue({ data: { success: true }, error: null })
    const user = userEvent.setup()
    renderAt('/dashboard')

    await user.click(screen.getByRole('button', { name: /Paramètres du compte de Alice/ }))
    await user.click(screen.getByRole('button', { name: /Supprimer mon compte/ }))
    const confirm = screen.getByRole('button', { name: /Supprimer définitivement/ })
    expect(confirm).toBeDisabled()

    await user.type(screen.getByLabelText(/irréversible/), 'MonMotDePasse!1')
    await user.click(confirm)

    expect(authClientMock.deleteUser).toHaveBeenCalledWith({ password: 'MonMotDePasse!1' })
  })

  // Hors de l'accueil, une ancre seule pointerait vers une section inexistante.
  it('fait pointer les ancres vers l’accueil depuis une autre page', () => {
    renderAt('/dashboard')
    expect(screen.getByRole('link', { name: 'Langages' })).toHaveAttribute('href', '/#languages')
  })

  it('permet de basculer la langue du site depuis le bouton du header', async () => {
    const user = userEvent.setup()
    renderAt('/')

    // En français au départ
    expect(screen.getByRole('link', { name: 'Démo de Code' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Langages' })).toBeInTheDocument()

    const switchBtn = screen.getByRole('button', { name: 'Passer en anglais' })
    await user.click(switchBtn)

    // En anglais après le clic
    expect(screen.getByRole('link', { name: 'Code Demo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Languages' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Passer en français' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
  })
})
