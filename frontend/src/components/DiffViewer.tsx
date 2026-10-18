import { Fragment, type ReactNode } from 'react'
import { FileCode2, MessageSquarePlus } from 'lucide-react'

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

// Le + / − et le libellé masqué doublent la couleur de fond, seule
// indication sinon du sens de la ligne.
const MARKERS: Record<DiffLine['type'], { symbol: string; label: string }> = {
  add: { symbol: '+', label: 'Ligne ajoutée' },
  delete: { symbol: '−', label: 'Ligne supprimée' },
  context: { symbol: ' ', label: 'Ligne inchangée' },
  hunk: { symbol: ' ', label: 'Bloc' },
}

export default function DiffViewer({
  filename,
  lines,
  onCommentLine,
  commentedLines,
  renderAfterLine,
  children,
}: DiffViewerProps) {
  const added = lines.filter((l) => l.type === 'add').length
  const deleted = lines.filter((l) => l.type === 'delete').length

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
          const marker = MARKERS[line.type]
          const commentable = onCommentLine && line.newLineNumber !== undefined
          const commented = line.newLineNumber !== undefined && commentedLines?.has(line.newLineNumber)

          return (
            <Fragment key={idx}>
              <div
                className={`diff-row row-${line.type}${line.isVulnerable ? ' is-vulnerable-row' : ''}${
                  commented ? ' is-commented-row' : ''
                }`}
              >
                <div className="line-num line-num-old">{line.oldLineNumber ?? ''}</div>
                <div className="line-num line-num-new">
                  {commentable ? (
                    <button
                      type="button"
                      className="line-comment-btn"
                      onClick={() => onCommentLine(line)}
                      aria-label={`Commenter la ligne ${line.newLineNumber} de ${filename}`}
                    >
                      <span className="line-comment-num">{line.newLineNumber}</span>
                      <MessageSquarePlus size={14} className="line-comment-icon" aria-hidden="true" />
                    </button>
                  ) : (
                    (line.newLineNumber ?? '')
                  )}
                </div>
                <div className="line-marker" aria-hidden="true">
                  {marker.symbol}
                </div>
                <div className="line-code">
                  <span className="visually-hidden">{marker.label} : </span>
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
