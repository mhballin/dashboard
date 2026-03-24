import React, { useState } from 'react'
import { theme } from '../styles/theme'

export default function FeatureRequestModal({ isOpen, onClose, onSubmit }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [attachmentName, setAttachmentName] = useState(null)
  const [attachmentData, setAttachmentData] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0]
    if (!f) {
      setAttachmentName(null)
      setAttachmentData(null)
      return
    }
    setAttachmentName(f.name)
    const reader = new FileReader()
    reader.onload = () => setAttachmentData(reader.result)
    reader.readAsDataURL(f)
  }

  const handleSubmit = async () => {
    if (!title && !description) return
    setSubmitting(true)
    try {
      await onSubmit({ title, description, attachments: attachmentData ? [{ name: attachmentName, data: attachmentData }] : [] })
      setTitle('')
      setDescription('')
      setAttachmentName(null)
      setAttachmentData(null)
      onClose()
    } catch (err) {
      console.error('Feature request failed', err)
      alert('Failed to submit feature request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: 600, maxWidth: '94%', background: 'white', padding: 20, borderRadius: 12, boxShadow: theme.cardShadow, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Submit a feature request</div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }} aria-label="Close">×</button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short title" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${theme.colors.inputBorder}`, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the feature and why it's useful" rows={6} style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${theme.colors.inputBorder}`, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: theme.colors.muted, display: 'block', marginBottom: 6 }}>Attachment (optional)</label>
          <input type="file" accept="image/*" onChange={handleFile} />
          {attachmentName ? <div style={{ fontSize: 12, color: theme.colors.muted, marginTop: 6 }}>{attachmentName}</div> : null}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${theme.colors.inputBorder}`, background: 'transparent', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ padding: '8px 12px', borderRadius: 10, background: '#16a34a', color: 'white', border: 'none', cursor: 'pointer' }}>{submitting ? 'Sending…' : 'Send request'}</button>
        </div>
      </div>
    </div>
  )
}
