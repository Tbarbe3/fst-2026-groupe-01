import { createAuthClient } from 'better-auth/react'

// Sans baseURL, le client déduit window.location.origin + '/api/auth' :
// la même configuration fonctionne derrière le proxy Vite et derrière Traefik.
export const authClient = createAuthClient()
