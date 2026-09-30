import { useEffect, useState } from 'react'
import './App.css'

interface User {
  id: string
  username: string
  createdAt: string
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; users: User[] }

function App() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    // Un AbortController évite de poser un état sur un composant démonté,
    // cas courant avec le double montage du StrictMode en développement.
    const controller = new AbortController()

    // URL relative : le proxy Vite la relaie vers localhost:3000 en dev,
    // Traefik vers le conteneur de l'API en prod. Rien à configurer.
    fetch('/api/users', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`L'API a répondu ${response.status}`)
        }
        const body = (await response.json()) as { users: User[] }
        setState({ status: 'ready', users: body.users })
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Erreur inconnue',
        })
      })

    return () => controller.abort()
  }, [])

  return (
    <section id="center">
      <div>
        <h1>Code How?</h1>
        <p>
          Test de la chaîne complète : ce tableau est lu dans la table{' '}
          <code>users</code> de PostgreSQL, via <code>GET /api/users</code>.
        </p>
      </div>

      {state.status === 'loading' && <p>Chargement des utilisateurs…</p>}

      {state.status === 'error' && (
        <p role="alert">
          Impossible de joindre l'API : {state.message}
        </p>
      )}

      {state.status === 'ready' &&
        (state.users.length === 0 ? (
          <p>La table <code>users</code> est vide.</p>
        ) : (
          <table>
            <caption>{state.users.length} utilisateur(s)</caption>
            <thead>
              <tr>
                <th scope="col">Nom d'utilisateur</th>
                <th scope="col">Créé le</th>
              </tr>
            </thead>
            <tbody>
              {state.users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>
                    {new Date(user.createdAt).toLocaleString('fr-FR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
    </section>
  )
}

export default App
