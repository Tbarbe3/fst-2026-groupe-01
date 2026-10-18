import { useLocation } from 'react-router'

// Hors de l'accueil, les ancres renvoient vers les sections de la page d'accueil.
export function useSectionHref() {
  const { pathname } = useLocation()
  return (hash: string) => (pathname === '/' ? hash : `/${hash}`)
}
