import type { MouseEvent } from 'react'
import { useLocation } from 'react-router'

export function scrollToSection(hash: string): boolean {
  if (typeof document === 'undefined') return false
  const id = hash.replace(/^#/, '')
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return true
  }
  return false
}

export function handleSectionClick(hash: string, pathname: string) {
  return (e: MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault()
      scrollToSection(hash)
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', hash)
      }
    }
  }
}

// Hors de l'accueil, les ancres renvoient vers les sections de la page d'accueil.
export function useSectionHref() {
  const { pathname } = useLocation()
  return (hash: string) => (pathname === '/' ? hash : `/${hash}`)
}
