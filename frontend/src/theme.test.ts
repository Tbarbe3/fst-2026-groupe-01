import { beforeEach, describe, expect, it, vi } from 'vitest'

import { applyTheme, DEFAULT_THEME, readStoredTheme } from './theme'

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('retient le thème sombre par défaut', () => {
    expect(DEFAULT_THEME).toBe('dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('relit une préférence enregistrée', () => {
    applyTheme('light')
    expect(readStoredTheme()).toBe('light')
  })

  it('applique le thème sur la racine du document', () => {
    applyTheme('light')
    expect(document.documentElement.dataset['theme']).toBe('light')
  })

  it('ignore une valeur stockée invalide', () => {
    localStorage.setItem('codehow-theme', 'fuchsia')
    expect(readStoredTheme()).toBe('dark')
  })

  // En navigation privée, localStorage peut lever : un thème est un détail
  // d'affichage, il ne doit pas faire planter la page.
  it('survit à un localStorage indisponible', () => {
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('accès refusé')
      })
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('accès refusé')
      })

    expect(readStoredTheme()).toBe('dark')
    expect(() => applyTheme('light')).not.toThrow()
    expect(document.documentElement.dataset['theme']).toBe('light')

    getItem.mockRestore()
    setItem.mockRestore()
  })
})
