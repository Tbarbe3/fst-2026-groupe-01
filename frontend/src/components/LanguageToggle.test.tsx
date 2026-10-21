import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '../i18n'
import LanguageToggle from './LanguageToggle'

describe('LanguageToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('lang')
  })

  it('affiche les libellés de langue et l’accessibilité par défaut', () => {
    render(
      <I18nProvider>
        <LanguageToggle />
      </I18nProvider>,
    )

    const button = screen.getByRole('button', { name: 'Passer en anglais' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('title', 'Switch to English')
    expect(screen.getByText('FR')).toHaveClass('is-active')
    expect(screen.getByText('EN')).not.toHaveClass('is-active')
  })

  it('bascule vers l’anglais au clic', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <LanguageToggle />
      </I18nProvider>,
    )

    const button = screen.getByRole('button', { name: 'Passer en anglais' })
    await user.click(button)

    expect(button).toHaveAttribute('aria-label', 'Passer en français')
    expect(button).toHaveAttribute('title', 'Passer en français')
    expect(screen.getByText('EN')).toHaveClass('is-active')
    expect(screen.getByText('FR')).not.toHaveClass('is-active')
    expect(document.documentElement.lang).toBe('en')
  })
})
