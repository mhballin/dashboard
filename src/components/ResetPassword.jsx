import { useState } from 'react'
import { theme, cardStyle as themeCardStyle } from '../styles/theme'

export default function ResetPassword() {
  const [token] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('token') || ''
    } catch {
      return ''
    }
  })
  const [uid] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('uid') || ''
    } catch {
      return ''
    }
  })
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('idle') // idle, submitting, success, error

  const canSubmit = password.length >= 8 && password === confirm && uid && token

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    if (!canSubmit) {
      setError('Please provide matching passwords (min 8 characters).')
      return
    }
    setStatus('submitting')
    try {
      const resp = await fetch('/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token, password }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setError(data?.error || 'Reset failed')
        setStatus('error')
        return
      }
      setStatus('success')
      setTimeout(() => {
        window.location.href = '/'
      }, 1200)
    } catch (err) {
      setError(err?.message || 'Reset failed')
      setStatus('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: theme.fonts.ui }}>
      <div style={{ ...themeCardStyle(), padding: '36px 28px', width: '100%', maxWidth: 420 }}>
        <div style={{ fontWeight: 800, fontSize: 20, color: '#1a1a1a', marginBottom: 6 }}>Reset your password</div>
        <div style={{ fontSize: 13, color: theme.colors.muted, marginBottom: 18 }}>Enter a new password for your account.</div>
        {!token || !uid ? (
          <div style={{ color: '#dc2626', fontSize: 14 }}>Missing or invalid reset link.</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="New password" style={{ padding: '10px 14px', borderRadius: theme.radii.default, border: `1px solid ${theme.colors.inputBorder}`, fontSize: 14, fontFamily: theme.fonts.ui, outline: 'none' }} />
              <input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" placeholder="Confirm password" style={{ padding: '10px 14px', borderRadius: theme.radii.default, border: `1px solid ${theme.colors.inputBorder}`, fontSize: 14, fontFamily: theme.fonts.ui, outline: 'none' }} />
              {error && <div style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}
              {status === 'success' && <div style={{ color: theme.colors.primary, fontSize: 13 }}>Password updated — redirecting…</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="submit" disabled={!canSubmit || status === 'submitting'} style={{ padding: '10px 14px', borderRadius: theme.radii.default, border: 'none', background: theme.colors.primary, color: '#fff', fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>{status === 'submitting' ? 'Saving…' : 'Set new password'}</button>
                <button type="button" onClick={() => (window.location.href = '/')} style={{ padding: '10px 14px', borderRadius: theme.radii.default, border: `1px solid ${theme.colors.inputBorder}`, background: 'white', color: theme.colors.muted }}>Cancel</button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
