import { Fragment, type ReactNode } from 'react'
import { FileCode2, MessageSquarePlus } from 'lucide-react'

import { useI18n } from '@/i18n'

export interface DiffLine {
  type: 'context' | 'add' | 'delete' | 'hunk'
  code: string
  oldLineNumber?: number
  newLineNumber?: number
  isVulnerable?: boolean
}

interface DiffViewerProps {
  filename: string
  lines: DiffLine[]
  /** Rend commentables les lignes du nouveau fichier (ajoutées ou de contexte). */
  onCommentLine?: (line: DiffLine) => void
  commentedLines?: ReadonlySet<number>
  renderAfterLine?: (line: DiffLine) => ReactNode
  children?: ReactNode
}

const MARKER_SYMBOLS: Record<DiffLine['type'], string> = {
  add: '+',
  delete: '−',
  context: ' ',
  hunk: ' ',
}

export default function DiffViewer({
  filename,
  lines,
  onCommentLine,
  commentedLines,
  renderAfterLine,
  children,
}: DiffViewerProps) {
  const { t } = useI18n()
  const added = lines.filter((l) => l.type === 'add').length
  const deleted = lines.filter((l) => l.type === 'delete').length

  const markerLabels: Record<DiffLine['type'], string> = {
    add: t('diff.added'),
    delete: t('diff.deleted'),
    context: t('diff.unchanged'),
    hunk: t('diff.hunk'),
  }

  return (
    <div className="diff-viewer">
      <div className="diff-file-bar">
        <div className="diff-file-name">
          <FileCode2 size={16} aria-hidden="true" />
          <code>{filename}</code>
        </div>
        <div className="diff-file-stats">
          <span className="stat-added">+{added}</span>
          <span className="stat-deleted">−{deleted}</span>
        </div>
      </div>

      <div className="diff-code-body">
        {lines.map((line, idx) => {
          if (line.type === 'hunk') {
            return (
              <div key={idx} className="diff-row row-hunk">
                <div className="line-code">
                  <code>{line.code}</code>
                </div>
              </div>
            )
          }
          const symbol = MARKER_SYMBOLS[line.type]
          const label = markerLabels[line.type]
          const commentable = onCommentLine && line.newLineNumber !== undefined
          const commented = line.newLineNumber !== undefined && commentedLines?.has(line.newLineNumber)

          return (
            <Fragment key={idx}>
              {/* Clic souris sur toute la ligne ; le bouton reste la cible clavier. */}
              <div
                className={`diff-row row-${line.type}${line.isVulnerable ? ' is-vulnerable-row' : ''}${
                  commented ? ' is-commented-row' : ''
                }${commentable ? ' is-commentable-row' : ''}`}
                onClick={commentable ? () => onCommentLine(line) : undefined}
              >
                {onCommentLine && <div className="line-comment-slot">
                  {commentable && (
                    <button
                      type="button"
                      className="line-comment-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCommentLine(line)
                      }}
                      aria-label={t('diff.commentAria', { line: line.newLineNumber!, file: filename })}
                      title={t('diff.commentTitle')}
                    >
                      <MessageSquarePlus size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>}
                <div className="line-num line-num-old">{line.oldLineNumber ?? ''}</div>
                <div className="line-num line-num-new">{line.newLineNumber ?? ''}</div>
                <div className="line-marker" aria-hidden="true">
                  {symbol}
                </div>
                <div className="line-code">
                  <span className="visually-hidden">{label} : </span>
                  <code>{line.code}</code>
                </div>
              </div>
              {renderAfterLine?.(line)}
            </Fragment>
          )
        })}
      </div>

      {children}
    </div>
  )
}
