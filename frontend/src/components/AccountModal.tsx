import { useRef, useState } from 'react'
import * as React from 'react'
import { Camera, Moon, Sun, Trash2, X } from 'lucide-react'

import { authClient } from '../auth'
import { translateAccountError } from '../errors/dashboard-errors'
import { describeNetworkError } from '../errors/network-error'
import { describePasswordPolicy, validatePassword } from '../errors/password-policy'
import { useI18n } from '../i18n'
import { applyTheme, readStoredTheme, type Theme } from '../theme'
import FeedbackMessage from './FeedbackMessage'

/** Paramètres du compte, ouverts depuis la barre de navigation. */
export default function AccountModal({ onClose }: { onClose: () => void }) {
    const { locale, setLocale, t } = useI18n()
    const { data: session } = authClient.useSession()
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
            if (error) setEditError(translateAccountError(error, locale))
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
            if (error) setEditError(translateAccountError(error, locale))
            else setEditingField(null)
        } catch (err: unknown) {
            setEditError(describeNetworkError(err, locale) ?? t('common.genericError'))
        } finally {
            setIsSaving(false)
        }
    }

    const displayName = session?.user?.name || session?.user?.email || 'Utilisateur'
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
                    setEditError(translateAccountError(error, locale))
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
                setEditError(translateAccountError(error, locale))
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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{t('account.title')}</h3>
                    <button className="btn-close" onClick={onClose} aria-label={t('common.close')}>
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

                    {/* Photo de profil */}
                    <div className="setting-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="setting-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
                            <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: 'var(--border)' }}>
                                {currentAvatar ? (
                                    <img
                                        src={currentAvatar}
                                        alt="Avatar"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontWeight: 'bold' }}>
                                        {initial}
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <label style={{ display: 'block', margin: 0 }}>{t('account.avatar')}</label>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('account.avatarHint')}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/png, image/jpeg, image/webp"
                                onChange={handleAvatarUpload}
                            />
                            <button
                                type="button"
                                className="btn-text"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isSaving}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', height: '36px' }}
                            >
                                <Camera size={16} /> {t('account.change')}
                            </button>
                            {currentAvatar && (
                                <button
                                    type="button"
                                    className="btn-text"
                                    onClick={handleRemoveAvatar}
                                    disabled={isSaving}
                                    title={t('account.deletePhoto')}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', height: '36px', color: 'var(--danger, #ef4444)' }}
                                >
                                    <Trash2 size={16} /> {t('account.delete')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Thème */}
                    <div className="setting-row">
                        <div className="setting-info">
                            <label>{t('account.themeLabel')}</label>
                            <span>{currentTheme === 'dark' ? t('account.themeDark') : t('account.themeLight')}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                                className={`btn-icon ${currentTheme === 'light' ? 'active' : ''}`}
                                onClick={() => handleThemeChange('light')}
                                title={t('theme.switchToLight')}
                                style={{
                                    border: currentTheme === 'light' ? '2px solid var(--primary, #3b82f6)' : '1px solid var(--border)',
                                    padding: '0.4rem',
                                    borderRadius: '6px'
                                }}
                            >
                                <Sun size={18} />
                            </button>
                            <button
                                className={`btn-icon ${currentTheme === 'dark' ? 'active' : ''}`}
                                onClick={() => handleThemeChange('dark')}
                                title={t('theme.switchToDark')}
                                style={{
                                    border: currentTheme === 'dark' ? '2px solid var(--primary, #3b82f6)' : '1px solid var(--border)',
                                    padding: '0.4rem',
                                    borderRadius: '6px'
                                }}
                            >
                                <Moon size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Langue de l'interface */}
                    <div className="setting-row">
                        <div className="setting-info">
                            <label>{t('account.langLabel')}</label>
                            <span>{locale === 'fr' ? 'Français' : 'English'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                                type="button"
                                className={`btn-text ${locale === 'fr' ? 'active' : ''}`}
                                onClick={() => setLocale('fr')}
                                style={{
                                    border: locale === 'fr' ? '2px solid var(--primary, #3b82f6)' : '1px solid var(--border)',
                                    padding: '0.4rem 0.75rem',
                                    borderRadius: '6px',
                                    fontWeight: locale === 'fr' ? 600 : 400,
                                }}
                            >
                                {t('account.langFr')}
                            </button>
                            <button
                                type="button"
                                className={`btn-text ${locale === 'en' ? 'active' : ''}`}
                                onClick={() => setLocale('en')}
                                style={{
                                    border: locale === 'en' ? '2px solid var(--primary, #3b82f6)' : '1px solid var(--border)',
                                    padding: '0.4rem 0.75rem',
                                    borderRadius: '6px',
                                    fontWeight: locale === 'en' ? 600 : 400,
                                }}
                            >
                                {t('account.langEn')}
                            </button>
                        </div>
                    </div>

                    {/* Email (Lecture seule) */}
                    <div className="setting-row">
                        <div className="setting-info">
                            <label>{t('account.email')}</label>
                            <span>{session?.user?.email}</span>
                        </div>
                    </div>

                    {/* Pseudo */}
                    <div className="setting-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="setting-info" style={{ flex: 1 }}>
                            <label>{t('account.pseudo')}</label>
                            {editingField !== 'name' && <span>{displayName}</span>}
                            {editingField === 'name' && (
                                <div style={{ marginTop: '0.25rem' }}>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        autoFocus
                                        placeholder={t('account.newPseudo')}
                                        disabled={isSaving}
                                    />
                                </div>
                            )}
                        </div>
                        {editingField === 'name' ? (
                            <div className="setting-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', height: 'fit-content' }}>
                                <button
                                    type="button"
                                    className="btn-text"
                                    onClick={() => setEditingField(null)}
                                    disabled={isSaving}
                                    style={{ display: 'inline-flex', alignItems: 'center', height: '36px', margin: 0 }}
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary-sm"
                                    onClick={handleSaveName}
                                    disabled={isSaving}
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', margin: 0 }}
                                >
                                    {isSaving ? t('common.saving') : t('common.save')}
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="btn-text"
                                onClick={() => openEdit('name')}
                                style={{ display: 'inline-flex', alignItems: 'center', height: '36px' }}
                            >
                                {t('common.edit')}
                            </button>
                        )}
                    </div>

                    {/* Mot de passe */}
                    <div className="setting-row" style={{ display: 'flex', alignItems: editingField === 'password' ? 'flex-start' : 'center', justifyContent: 'space-between' }}>
                        <div className="setting-info" style={{ flex: 1 }}>
                            <label>{t('account.password')}</label>
                            {editingField !== 'password' && <span>••••••••</span>}
                            {editingField === 'password' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                                    <input type="password" className="form-control" value={editPassCurrent} onChange={e => setEditPassCurrent(e.target.value)} placeholder={t('account.currentPassword')} autoFocus disabled={isSaving} />
                                    <input type="password" className="form-control" value={editPassNew} onChange={e => setEditPassNew(e.target.value)} placeholder={t('account.newPassword')} disabled={isSaving} />
                                    <small className="form-hint">{describePasswordPolicy(locale)}</small>
                                    <input type="password" className="form-control" value={editPassConfirm} onChange={e => setEditPassConfirm(e.target.value)} placeholder={t('account.confirmNewPassword')} disabled={isSaving} />
                                </div>
                            )}
                        </div>
                        {editingField === 'password' ? (
                            <div className="setting-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', alignSelf: 'flex-end', marginTop: 'auto' }}>
                                <button
                                    type="button"
                                    className="btn-text"
                                    onClick={() => setEditingField(null)}
                                    disabled={isSaving}
                                    style={{ display: 'inline-flex', alignItems: 'center', height: '36px', margin: 0 }}
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary-sm"
                                    onClick={handleSavePassword}
                                    disabled={isSaving}
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', margin: 0 }}
                                >
                                    {isSaving ? t('common.saving') : t('common.save')}
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="btn-text"
                                onClick={() => openEdit('password')}
                                style={{ display: 'inline-flex', alignItems: 'center', height: '36px' }}
                            >
                                {t('common.edit')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
