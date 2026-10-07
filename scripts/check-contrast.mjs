#!/usr/bin/env node
/**
 * Vérifie les contrastes des deux thèmes déclarés dans frontend/src/index.css.
 *
 * Plusieurs paires de la palette passent de justesse (4.62:1 pour un minimum
 * de 4.5), d'où ce contrôle automatisé : un ajustement de teinte qui paraît
 * anodin peut faire basculer une paire sous le seuil sans que cela se voie.
 *
 * Seuils WCAG 2.1 : 4.5:1 pour le texte courant (AA, 1.4.3), 3:1 pour les
 * limites des contrôles de saisie et les indicateurs de focus (AA, 1.4.11).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(join(root, 'frontend/src/index.css'), 'utf8')

function readVars(selector) {
  const start = css.indexOf(selector)
  if (start === -1) {
    throw new Error(`Sélecteur introuvable dans index.css : ${selector}`)
  }
  const open = css.indexOf('{', start)
  const body = css.slice(open + 1, css.indexOf('}', open))
  const vars = {}
  for (const [, name, value] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    vars[name] = value.trim()
  }
  return vars
}

const toRgb = (h) =>
  h
    .replace('#', '')
    .match(/../g)
    .map((x) => parseInt(x, 16))

const luminance = (color) => {
  const [r, g, b] = toRgb(color).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)]
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

const themes = {
  sombre: readVars(":root,\n[data-theme='dark']"),
  clair: readVars("[data-theme='light']"),
}

const pairsFor = (v) => [
  ['texte sur surface', v.text, v.surface, 4.5],
  ['texte atténué', v['text-muted'], v.surface, 4.5],
  ['placeholder sur champ', v['text-placeholder'], v['surface-sunken'], 4.5],
  ['lien', v.link, v.surface, 4.5],
  ['lien survolé', v['link-hover'], v.surface, 4.5],
  ['message d’erreur', v.danger, v.surface, 4.5],
  ['message de succès', v.success, v.surface, 4.5],
  ['texte du bouton', v['action-text'], v['action-bg'], 4.5],
  ['texte du bouton survolé', v['action-text'], v['action-bg-hover'], 4.5],
  ['bordure de champ', v['border-control'], v.surface, 3],
  ['anneau de focus sur surface', v['focus-ring'], v.surface, 3],
  ['anneau de focus sur fond', v['focus-ring'], v.bg, 3],
]

let failures = 0

for (const [name, vars] of Object.entries(themes)) {
  console.log(`\nThème ${name}`)
  for (const [label, fg, bg, minimum] of pairsFor(vars)) {
    if (!fg?.startsWith('#') || !bg?.startsWith('#')) {
      console.log(`  ?            ${label} — variable absente ou non hexadécimale`)
      failures += 1
      continue
    }
    const value = contrast(fg, bg)
    const ok = value >= minimum
    if (!ok) failures += 1
    console.log(
      `  ${ok ? 'OK   ' : 'ÉCHEC'} ${value.toFixed(2).padStart(5)}:1 (min ${minimum})  ${label}`,
    )
  }
}

if (failures > 0) {
  console.error(
    `\n${failures} paire(s) sous le seuil. Ajuster la palette dans frontend/src/index.css.`,
  )
  process.exit(1)
}

console.log('\nToutes les paires respectent les seuils WCAG AA.')
