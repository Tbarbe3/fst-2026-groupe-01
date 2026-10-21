import { useState } from 'react'
import { useNavigate } from 'react-router'
import { HelpCircle, Play } from 'lucide-react'

import { challengesApi } from '../api/challenges'
import { describeError } from '../errors/network-error'
import { useI18n } from '../i18n'
import {
  getCategoryLabels,
  getDifficultyLabels,
  LANGUAGE_LABELS,
} from '../labels'
import FeedbackMessage from './FeedbackMessage'
import LoadingScreen from './LoadingScreen'

const options = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, text]) => (
    <option key={value} value={value}>
      {text}
    </option>
  ))

export default function ChallengeLauncher() {
  const { locale, t } = useI18n()
  const navigate = useNavigate()
  const [language, setLanguage] = useState('typescript')
  const [difficulty, setDifficulty] = useState('1')
  const [category, setCategory] = useState('security_owasp')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const categoryLabels = getCategoryLabels(locale)
  const difficultyLabels = getDifficultyLabels(locale)

  const launch = async (mystery: boolean) => {
    setError('')
    setPending(true)
    try {
      const { attemptId } = await challengesApi.create(
        mystery ? { mystery: true } : { language, difficulty, category },
      )
      await navigate(`/review/${attemptId}`)
    } catch (err: unknown) {
      setError(describeError(err, t('launcher.error'), locale))
      setPending(false)
    }
  }

  // La génération par l'IA prend de 10 à 30 secondes.
  if (pending) return <LoadingScreen label={t('launcher.preparing')} />

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
          <span>{t('launcher.language')}</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {options(LANGUAGE_LABELS)}
          </select>
        </label>
        <label className="launcher-field">
          <span>{t('launcher.difficulty')}</span>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {options(difficultyLabels)}
          </select>
        </label>
        <label className="launcher-field">
          <span>{t('launcher.category')}</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {options(categoryLabels)}
          </select>
        </label>
      </div>

      <div className="form-feedback" data-visible={Boolean(error)}>
        {error && <FeedbackMessage kind="error">{error}</FeedbackMessage>}
      </div>

      <div className="launcher-actions">
        <button type="submit" className="btn btn-primary">
          <Play size={16} aria-hidden="true" /> {t('launcher.launch')}
        </button>
        <button type="button" className="btn btn-mystery" onClick={() => void launch(true)}>
          <HelpCircle size={16} aria-hidden="true" /> {t('launcher.mystery')}
        </button>
      </div>
      <p className="launcher-hint">{t('launcher.hint')}</p>
    </form>
  )
}
