import { useState } from 'react'
import { useNavigate } from 'react-router'
import { HelpCircle, Play } from 'lucide-react'

import { challengesApi } from '../api/challenges'
import { describeNetworkError } from '../errors/network-error'
import { CATEGORY_LABELS, DIFFICULTY_LABELS, LANGUAGE_LABELS } from '../labels'
import FeedbackMessage from './FeedbackMessage'
import LoadingScreen from './LoadingScreen'

const options = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, text]) => (
    <option key={value} value={value}>
      {text}
    </option>
  ))

export default function ChallengeLauncher() {
  const navigate = useNavigate()
  const [language, setLanguage] = useState('typescript')
  const [difficulty, setDifficulty] = useState('junior')
  const [category, setCategory] = useState('security_owasp')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const launch = async (mystery: boolean) => {
    setError('')
    setPending(true)
    try {
      const { attemptId } = await challengesApi.create(
        mystery ? { mystery: true } : { language, difficulty, category },
      )
      await navigate(`/review/${attemptId}`)
    } catch (err: unknown) {
      setError(describeNetworkError(err) ?? (err instanceof Error ? err.message : 'Impossible de créer le challenge.'))
      setPending(false)
    }
  }

  // La génération par l'IA prend de 10 à 30 secondes.
  if (pending) return <LoadingScreen label="Préparation de la pull request…" />

  return (
    <form
      className="challenge-launcher"
      onSubmit={(e) => {
        e.preventDefault()
        void launch(false)
      }}
    >
      <div className="launcher-fields">
        <label className="launcher-field">
          <span>Langage</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {options(LANGUAGE_LABELS)}
          </select>
        </label>
        <label className="launcher-field">
          <span>Difficulté</span>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {options(DIFFICULTY_LABELS)}
          </select>
        </label>
        <label className="launcher-field">
          <span>Type d’erreur</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {options(CATEGORY_LABELS)}
          </select>
        </label>
      </div>

      <div className="form-feedback" data-visible={Boolean(error)}>{error && <FeedbackMessage kind="error">{error}</FeedbackMessage>}</div>

      <div className="launcher-actions">
        <button type="submit" className="btn btn-primary">
          <Play size={16} aria-hidden="true" /> Lancer le challenge
        </button>
        <button type="button" className="btn btn-mystery" onClick={() => void launch(true)}>
          <HelpCircle size={16} aria-hidden="true" /> Mode Mystère
        </button>
      </div>
      <p className="launcher-hint">
        Le mode Mystère tire au hasard le langage, la difficulté et le type d’erreur, sans vous les révéler.
      </p>
    </form>
  )
}
