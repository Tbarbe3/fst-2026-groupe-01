import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authClientMock, sessionActive } from '@/tests/session.ts'
import { I18nProvider } from '@/i18n'
import AccountModal from './AccountModal'

vi.mock('../auth', () => ({ authClient: authClientMock }))

function Harness() {
  const [open, setOpen] = useState(true)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ouvrir
      </button>
      {open && <AccountModal onClose={() => setOpen(false)} />}
    </>
  )
}

function renderModal() {
  const router = createMemoryRouter([{ path: '/', element: <Harness /> }])
  return render(
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>,
  )
}

describe('AccountModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionActive({ id: 'u1', name: 'Alice', email: 'alice@code.fr' })
  })

  it('est une fenêtre modale nommée qui reçoit le focus', () => {
    renderModal()
    const dialog = screen.getByRole('dialog', { name: 'Paramètres du Compte' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
  })

  it('se ferme avec Échap et rend le focus au bouton d’ouverture', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const opener = screen.getByRole('button', { name: 'Ouvrir' })
    await user.click(opener)
    await user.keyboard('{Escape}')
    expect(opener).toHaveFocus()
  })

  it('garde le focus à l’intérieur de la fenêtre', async () => {
    const user = userEvent.setup()
    renderModal()
    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 20; i++) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
  })

  it('signale le thème et la langue actifs autrement que par la couleur', async () => {
    const user = userEvent.setup()
    renderModal()
    expect(screen.getByRole('button', { name: 'Français' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Clair' }))
    expect(screen.getByRole('button', { name: 'Clair' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.dataset['theme']).toBe('light')
  })

  it('enregistre le nouveau pseudo', async () => {
    authClientMock.updateUser.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getAllByRole('button', { name: 'Modifier' })[0]!)
    const field = screen.getByLabelText('Pseudo')
    await user.clear(field)
    await user.type(field, 'Alicia')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(authClientMock.updateUser).toHaveBeenCalledWith({ name: 'Alicia' })
  })

  it('refuse deux nouveaux mots de passe différents sans appeler le serveur', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getAllByRole('button', { name: 'Modifier' })[1]!)
    await user.type(screen.getByLabelText('Mot de passe actuel'), 'Ancien!123')
    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'Nouveau!123')
    await user.type(screen.getByLabelText('Confirmer le nouveau mot de passe'), 'Autre!123')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(screen.getByText('Les nouveaux mots de passe ne correspondent pas.')).toBeInTheDocument()
    expect(authClientMock.changePassword).not.toHaveBeenCalled()
  })

  it('refuse un nouveau mot de passe identique à l’ancien sans appeler le serveur', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getAllByRole('button', { name: 'Modifier' })[1]!)
    await user.type(screen.getByLabelText('Mot de passe actuel'), 'Identique!123')
    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'Identique!123')
    await user.type(screen.getByLabelText('Confirmer le nouveau mot de passe'), 'Identique!123')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(
      screen.getByText('Le nouveau mot de passe doit être différent de l’ancien.'),
    ).toBeInTheDocument()
    expect(authClientMock.changePassword).not.toHaveBeenCalled()
  })
})
