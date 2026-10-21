import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyLocaleToDocument,
  DEFAULT_LOCALE,
  interpolate,
  readStoredLocale,
  translate,
  useI18n,
} from './core'
import { I18nProvider } from './I18nProvider'

function Consumer() {
  const { locale, setLocale, toggleLocale, t, formatDate } = useI18n()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="title">{t('home.heroTitle')}</span>
      <span data-testid="interpolated">
        {t('home.myDashboard', { name: 'Bob' })}
      </span>
      <span data-testid="date">{formatDate('2026-10-19', { month: 'long' })}</span>
      <button type="button" onClick={toggleLocale}>
        Toggle
      </button>
      <button type="button" onClick={() => setLocale('en')}>
        Set EN
      </button>
      <button type="button" onClick={() => setLocale('fr')}>
        Set FR
      </button>
    </div>
  )
}

describe('I18nContext', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('lang')
  })

  it('retient le français par défaut', () => {
    expect(DEFAULT_LOCALE).toBe('fr')
    expect(readStoredLocale()).toBe('fr')
  })

  it('applique la locale sur l’élément HTML racine et localStorage', () => {
    applyLocaleToDocument('en')
    expect(document.documentElement.lang).toBe('en')
    expect(readStoredLocale()).toBe('en')
  })

  it('ignore une valeur stockée invalide', () => {
    localStorage.setItem('codehow-locale', 'es')
    expect(readStoredLocale()).toBe('fr')
  })

  it('survit à un localStorage indisponible', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('accès refusé')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('accès refusé')
    })

    expect(readStoredLocale()).toBe('fr')
    expect(() => applyLocaleToDocument('en')).not.toThrow()
    expect(document.documentElement.lang).toBe('en')

    getItem.mockRestore()
    setItem.mockRestore()
  })

  it('interpole correctement les paramètres {param}', () => {
    expect(interpolate('Bonjour {name} !', { name: 'Thomas' })).toBe('Bonjour Thomas !')
    expect(interpolate('Pas de paramètre')).toBe('Pas de paramètre')
  })

  it('traduit selon la locale passée', () => {
    expect(translate('fr', 'common.loading')).toBe('Chargement…')
    expect(translate('en', 'common.loading')).toBe('Loading…')
  })

  it('permet de basculer de langue dynamiquement dans React', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>,
    )

    expect(screen.getByTestId('locale')).toHaveTextContent('fr')
    expect(screen.getByTestId('title')).toHaveTextContent('Maîtrisez la revue de code.')
    expect(screen.getByTestId('interpolated')).toHaveTextContent('Tableau de bord de Bob')

    await user.click(screen.getByRole('button', { name: 'Toggle' }))

    expect(screen.getByTestId('locale')).toHaveTextContent('en')
    expect(screen.getByTestId('title')).toHaveTextContent('Master code review.')
    expect(screen.getByTestId('interpolated')).toHaveTextContent('Dashboard for Bob')
    expect(document.documentElement.lang).toBe('en')

    await user.click(screen.getByRole('button', { name: 'Set FR' }))
    expect(screen.getByTestId('locale')).toHaveTextContent('fr')
    expect(screen.getByTestId('title')).toHaveTextContent('Maîtrisez la revue de code.')
  })
})
