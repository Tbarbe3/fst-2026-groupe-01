#!/usr/bin/env node
/**
 * Vérifie que le poste est prêt avant de lancer `npm run dev`.
 *
 * Sans ce garde-fou, un fichier .env manquant fait sortir l'API aussitôt,
 * concurrently arrête les autres services avec un SIGTERM, et le message
 * affiché ne désigne pas la cause : on voit « tunnel exited with SIGTERM »
 * alors que le problème est ailleurs.
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const checks = [
  {
    path: '.env',
    fix: 'cp .env.example .env',
    why: 'lu par docker compose uniquement',
    // `npm run dev` n'en a pas besoin : bloquer dessus serait un faux
    // positif. Seuls `db:up` et le déploiement le lisent.
    optional: true,
  },
  {
    path: 'backend/.env',
    fix: 'cp backend/.env.example backend/.env',
    why: "lu par l'API ; y mettre le mot de passe Postgres du serveur",
  },
  {
    path: 'node_modules',
    fix: 'npm run setup',
    why: 'dépendances de la racine',
  },
  {
    path: 'backend/node_modules',
    fix: 'npm run setup',
    why: "dépendances de l'API",
  },
  {
    path: 'frontend/node_modules',
    fix: 'npm run setup',
    why: 'dépendances du front',
  },
]

const missing = checks.filter((c) => !existsSync(join(root, c.path)))
const blocking = missing.filter((c) => !c.optional)

function report(title, items) {
  if (items.length === 0) return
  console.error(`\n${title}\n`)
  for (const { path, why, fix } of items) {
    console.error(`  ${path}`)
    console.error(`      ${why}`)
    console.error(`      → ${fix}\n`)
  }
}

report('Il manque de quoi démarrer :', blocking)
report(
  'Absent, mais non bloquant pour `npm run dev` :',
  missing.filter((c) => c.optional),
)

if (blocking.length > 0) {
  console.error("Détail de l'initialisation : voir la section Démarrage du README.\n")
  process.exit(1)
}
