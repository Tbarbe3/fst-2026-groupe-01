import { useRef, useState } from 'react'
import * as React from 'react'
import { useNavigate } from 'react-router'
import { Camera, Moon, Sun, Trash2, X } from 'lucide-react'

import { authClient } from '../auth'
import { translateAuthError } from '../errors/auth-errors'
import { describeNetworkError } from '../errors/network-error'
import { describePasswordPolicy, validatePassword } from '../errors/password-policy'
import { useI18n } from '@/i18n'
import { applyTheme, readStoredTheme, type Theme } from '../theme'
import { useDialog } from '../hooks/useDialog'
import FeedbackMessage from './FeedbackMessage'

const THEME_CHOICES = [
    { value: 'light', icon: Sun, label: 'account.themeLight' },
    { value: 'dark', icon: Moon, label: 'account.themeDark' },
] as const

const LANG_CHOICES = [
    { value: 'fr', label: 'account.langFr' },
    { value: 'en', label: 'account.langEn' },
] as const

/** Paramètres du compte, ouverts depuis la barre de navigation. */
export default function AccountModal({ onClose }: { onClose: () => void }) {
    const { locale, setLocale, t } = useI18n()
    const dialogRef = useDialog<HTMLDivElement>(onClose)
    const { data: session } = authClient.useSession()
    const navigate = useNavigate()
    const [currentTheme, setCurrentTheme] = useState<Theme>(readStoredTheme)

    const [editingField, setEditingField] = useState<'name' | 'password' | null>(null)
    const [editName, setEditName] = useState('')
    const [editPassCurrent, setEditPassCurrent] = useState('')
    const [editPassNew, setEditPassNew] = useState('')
    const [editPassConfirm, setEditPassConfirm] = useState('')
    const [editError, setEditError] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const handleThemeChange = (t: Theme) => {
        applyTheme(t)
        setCurrentTheme(t)
    }

    const openEdit = (field: 'name' | 'password') => {
        setEditError('')
        setEditName(session?.user?.name || '')
        setEditPassCurrent('')
        setEditPassNew('')
        setEditPassConfirm('')
        setEditingField(field)
    }

    const handleSaveName = async () => {
        if (!editName.trim()) {
            setEditError(t('account.nameEmpty'))
            return
        }
        setIsSaving(true)
        setEditError('')

        try {
            const { error } = await authClient.updateUser({ name: editName })
            if (error) setEditError(translateAuthError(error, 'errors.generic', locale))
            else setEditingField(null)
        } catch (err: unknown) {
            setEditError(describeNetworkError(err, locale) ?? t('common.genericError'))
        } finally {
            setIsSaving(false)
        }
    }

    const handleSavePassword = async () => {
        if (!editPassCurrent || !editPassNew || !editPassConfirm) {
            setEditError(t('account.fillAllFields'))
            return
        }
        if (editPassCurrent === editPassNew) {
            setEditError(t('errors.passwordSameAsCurrent'))
            return
        }
        if (editPassNew !== editPassConfirm) {
            setEditError(t('account.passwordsMismatch'))
            return
        }
        const policyError = validatePassword(editPassNew, locale)
        if (policyError) {
            setEditError(policyError)
            return
        }
        setIsSaving(true)
        setEditError('')

        try {
            const { error } = await authClient.changePassword({
                newPassword: editPassNew,
                currentPassword: editPassCurrent,
                revokeOtherSessions: true,
            })
            if (error) setEditError(translateAuthError(error, 'errors.generic', locale))
            else setEditingField(null)
        } catch (err: unknown) {
            setEditError(describeNetworkError(err, locale) ?? t('common.genericError'))
        } finally {
            setIsSaving(false)
        }
    }

    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [deletePassword, setDeletePassword] = useState('')

    const handleDeleteAccount = async () => {
        setIsSaving(true)
        setEditError('')
        try {
            const { error } = await authClient.deleteUser({ password: deletePassword })
            if (error) {
                setEditError(translateAuthError(error, 'errors.generic', locale))
                return
            }
            onClose()
            await navigate('/', { replace: true })
        } catch (err: unknown) {
            setEditError(describeNetworkError(err, locale) ?? t('common.genericError'))
        } finally {
            setIsSaving(false)
        }
    }

    const displayName = session?.user?.name || session?.user?.email || ''
    const initial = displayName.charAt(0).toUpperCase()

    const fileInputRef = useRef<HTMLInputElement>(null)
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined)
    const currentAvatar = avatarUrl ?? session?.user?.image ?? undefined

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) {
            setEditError(t('account.fileTooLarge'))
            return
        }

        const img = new Image()
        img.src = URL.createObjectURL(file)
        img.onload = async () => {
            const canvas = document.createElement('canvas')
            const size = 128
            canvas.width = size
            canvas.height = size

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            ctx.drawImage(img, 0, 0, size, size)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)

            setIsSaving(true)
            setEditError('')
            try {
                const { error } = await authClient.updateUser({ image: compressedBase64 })
                if (error) {
                    setEditError(translateAuthError(error, 'errors.generic', locale))
                } else {
                    setAvatarUrl(compressedBase64)
                }
            } catch (err: unknown) {
                setEditError(describeNetworkError(err, locale) ?? t('account.avatarUpdateError'))
            } finally {
                setIsSaving(false)
            }
        }
    }

    const handleRemoveAvatar = async () => {
        setIsSaving(true)
        setEditError('')
        try {
            const { error } = await authClient.updateUser({ image: '' })
            if (error) {
                setEditError(translateAuthError(error, 'errors.generic', locale))
            } else {
                setAvatarUrl(undefined)
                if (fileInputRef.current) fileInputRef.current.value = ''
            }
        } catch (err: unknown) {
            setEditError(describeNetworkError(err, locale) ?? t('account.avatarRemoveError'))
        } finally {
            setIsSaving(false)
        }
    }

    const editButton = (field: 'name' | 'password') => (
        <button type="button" className="btn-text" onClick={() => openEdit(field)}>
            {t('common.edit')}
        </button>
    )

    const editActions = (onSave: () => void) => (
        <div className="setting-actions">
            <button type="button" className="btn-text" onClick={() => setEditingField(null)} disabled={isSaving}>
                {t('common.cancel')}
            </button>
            <button type="button" className="btn-primary-sm" onClick={onSave} disabled={isSaving}>
                {isSaving ? t('common.saving') : t('common.save')}
            </button>
        </div>
    )

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                ref={dialogRef}
                className="modal-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="account-dialog-title"
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h3 id="account-dialog-title">{t('account.title')}</h3>
                    <button type="button" className="btn-close" onClick={onClose} aria-label={t('common.close')}>
                        <X size={18} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="form-feedback" data-visible={Boolean(editError)}>
                        <div>
                            {editError && (
                                <FeedbackMessage kind="error">{editError}</FeedbackMessage>
                            )}
                        </div>
                    </div>

                    <div className="setting-row">
                        <div className="setting-avatar">
                            <div className="avatar-preview">
                                {currentAvatar ? <img src={currentAvatar} alt="" /> : initial}
                            </div>
                            <div className="setting-info">
                                <label htmlFor="avatar-input">{t('account.avatar')}</label>
                                <span>{t('account.avatarHint')}</span>
                            </div>
                        </div>
                        <div className="setting-actions">
                            <input
                                id="avatar-input"
                                type="file"
                                ref={fileInputRef}
                                hidden
                                accept="image/png, image/jpeg, image/webp"
                                onChange={handleAvatarUpload}
                            />
                            <button type="button" className="btn-text" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
                                <Camera size={16} aria-hidden="true" /> {t('account.change')}
                            </button>
                            {currentAvatar && (
                                <button
                                    type="button"
                                    className="btn-text btn-text-danger"
                                    onClick={handleRemoveAvatar}
                                    disabled={isSaving}
                                    title={t('account.deletePhoto')}
                                >
                                    <Trash2 size={16} aria-hidden="true" /> {t('account.delete')}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <label id="theme-label">{t('account.themeLabel')}</label>
                        </div>
                        <div className="choice-group" role="group" aria-labelledby="theme-label">
                            {THEME_CHOICES.map(({ value, icon: Icon, label }) => (
                                <button
                                    key={value}
                                    type="button"
                                    className="choice-btn"
                                    aria-pressed={currentTheme === value}
                                    onClick={() => handleThemeChange(value)}
                                >
                                    <Icon size={16} aria-hidden="true" /> {t(label)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <label id="lang-label">{t('account.langLabel')}</label>
                        </div>
                        <div className="choice-group" role="group" aria-labelledby="lang-label">
                            {LANG_CHOICES.map(({ value, label }) => (
                                <button
                                    key={value}
                                    type="button"
                                    className="choice-btn"
                                    aria-pressed={locale === value}
                                    onClick={() => setLocale(value)}
                                >
                                    {t(label)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <label>{t('account.email')}</label>
                            <span>{session?.user?.email}</span>
                        </div>
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <label htmlFor="account-name">{t('account.pseudo')}</label>
                            {editingField === 'name' ? (
                                <input
                                    id="account-name"
                                    type="text"
                                    className="form-control"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    autoFocus
                                    placeholder={t('account.newPseudo')}
                                    disabled={isSaving}
                                />
                            ) : (
                                <span>{displayName}</span>
                            )}
                        </div>
                        {editingField === 'name' ? editActions(handleSaveName) : editButton('name')}
                    </div>

                    <div className="setting-row">
                        <div className="setting-info">
                            <label>{t('account.password')}</label>
                            {editingField === 'password' ? (
                                <div className="setting-fields">
                                    <input type="password" className="form-control" aria-label={t('account.currentPassword')} value={editPassCurrent} onChange={e => setEditPassCurrent(e.target.value)} placeholder={t('account.currentPassword')} autoComplete="current-password" autoFocus disabled={isSaving} />
                                    <input type="password" className="form-control" aria-label={t('account.newPassword')} aria-describedby="password-policy" value={editPassNew} onChange={e => setEditPassNew(e.target.value)} placeholder={t('account.newPassword')} autoComplete="new-password" disabled={isSaving} />
                                    <small id="password-policy" className="form-hint">{describePasswordPolicy(locale)}</small>
                                    <input type="password" className="form-control" aria-label={t('account.confirmNewPassword')} value={editPassConfirm} onChange={e => setEditPassConfirm(e.target.value)} placeholder={t('account.confirmNewPassword')} autoComplete="new-password" disabled={isSaving} />
                                </div>
                            ) : (
                                <span aria-hidden="true">••••••••</span>
                            )}
                        </div>
                        {editingField === 'password' ? editActions(handleSavePassword) : editButton('password')}
                    </div>

                    <div className="setting-row danger-zone">
                        {confirmingDelete ? (
                            <form
                                className="danger-zone-form"
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    void handleDeleteAccount()
                                }}
                            >
                                <label htmlFor="delete-password">{t('account.deleteAccountConfirm')}</label>
                                <input
                                    id="delete-password"
                                    type="password"
                                    className="form-control"
                                    value={deletePassword}
                                    onChange={e => setDeletePassword(e.target.value)}
                                    placeholder={t('account.currentPassword')}
                                    autoComplete="current-password"
                                    autoFocus
                                    disabled={isSaving}
                                />
                                <div className="setting-actions">
                                    <button
                                        type="button"
                                        className="btn-text"
                                        onClick={() => setConfirmingDelete(false)}
                                        disabled={isSaving}
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button type="submit" className="btn-danger" disabled={isSaving || !deletePassword}>
                                        <Trash2 size={16} aria-hidden="true" /> {t('account.deleteAccountFinal')}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className="setting-info">
                                    <label>{t('account.deleteAccount')}</label>
                                    <span>{t('account.deleteAccountHint')}</span>
                                </div>
                                <button
                                    type="button"
                                    className="btn-danger"
                                    onClick={() => {
                                        setEditError('')
                                        setDeletePassword('')
                                        setConfirmingDelete(true)
                                    }}
                                >
                                    <Trash2 size={16} aria-hidden="true" /> {t('account.deleteAccount')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
