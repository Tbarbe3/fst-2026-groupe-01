import { BookOpen, Lightbulb, MessageSquarePlus, Trophy, X } from 'lucide-react'

import { useI18n } from '@/i18n'

const SECTIONS = [
  { icon: BookOpen, title: 'review.helpReadTitle', body: 'review.helpRead' },
  { icon: MessageSquarePlus, title: 'review.helpCommentTitle', body: 'review.helpComment' },
  { icon: Trophy, title: 'review.helpScoreTitle', body: 'review.helpScore' },
  { icon: Lightbulb, title: 'review.helpTipTitle', body: 'review.helpTip' },
] as const

export default function ReviewHelp({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()

  return (
    <section id="review-help" className="review-help" aria-labelledby="review-help-title">
      <div className="review-help-head">
        <h2 id="review-help-title">{t('review.helpTitle')}</h2>
        <button type="button" className="btn-close" onClick={onClose} aria-label={t('review.helpClose')}>
          <X size={18} />
        </button>
      </div>
      <p className="review-help-intro">{t('review.helpIntro')}</p>
      <div className="review-help-grid">
        {SECTIONS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="review-help-item">
            <h3>
              <Icon size={16} aria-hidden="true" /> {t(title)}
            </h3>
            <p>{t(body)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
