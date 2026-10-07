import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  // Le thème est persisté dans localStorage : sans ce nettoyage, un test qui
  // bascule en clair fait échouer le suivant qui attend le thème par défaut.
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})
