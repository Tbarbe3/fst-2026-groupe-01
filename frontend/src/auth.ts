import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    // Laissons better-auth déduire l'URL de base depuis window.location
    // Par défaut, il utilisera window.location.origin + '/api/auth'
})
