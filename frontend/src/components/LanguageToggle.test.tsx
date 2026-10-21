import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '@/i18n'
import LanguageToggle from './LanguageToggle'

function renderToggle() {
  return render(
    <I18nProvider>
      <LanguageToggle />
    </I18nProvider>,
  )
}

describe('LanguageToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('lang')
  })

  it('nomme la langue cible, le drapeau étant décoratif', () => {
    renderToggle()
    const button = screen.getByRole('button', { name: 'Passer en anglais' })
    expect(button).toHaveAttribute('title', 'Switch to English')
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('bascule vers l’anglais puis revient au français', async () => {
    const user = userEvent.setup()
    renderToggle()

    await user.click(screen.getByRole('button', { name: 'Passer en anglais' }))
    expect(document.documentElement.lang).toBe('en')

    await user.click(screen.getByRole('button', { name: 'Passer en français' }))
    expect(document.documentElement.lang).toBe('fr')
  })
})
