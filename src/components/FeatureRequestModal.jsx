import React, { useEffect, useRef, useState } from 'react'
import { theme } from '../styles/theme'

const MAX_FILE_MB = 5
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

export default function FeatureRequestModal({ isOpen, onClose, onSubmit }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [attachmentName, setAttachmentName] = useState(null)
  const [attachmentData, setAttachmentData] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState(null)
  const fileInputRef = useRef(null)
  const closeTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  if (!isOpen) return null

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setAttachmentName(null)
    setAttachmentData(null)
    setFeedback(null)
    setFileError(null)
    setIsDragging(false)
  }

  const processFile = (f) => {
    if (!f) return
    setFileError(null)
    if (f.size > MAX_FILE_BYTES) {
      setFileError(`File is too large. Maximum size is ${MAX_FILE_MB} MB.`)
      setAttachmentName(null)
      setAttachmentData(null)
      return
    }
    setAttachmentName(f.name)
    const reader = new FileReader()
    reader.onload = () => setAttachmentData(reader.result)
    reader.readAsDataURL(f)
  }

  const handleClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    resetForm()
    onClose()
  }

  const handleFile = (e) => {
    processFile(e.target.files && e.target.files[0])
    // reset so re-selecting the same file still fires onChange
    e.target.value = ''
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const f = e.dataTransfer.files && e.dataTransfer.files[0]
    processFile(f)
  }

  const removeAttachment = () => {
    setAttachmentName(null)
    setAttachmentData(null)
    setFileError(null)
  }

  const handleSubmit = async () => {
    if (!title && !description) return
    setSubmitting(true)
    setFeedback(null)
    try {
      await onSubmit({ title, description, attachments: attachmentData ? [{ name: attachmentName, data: attachmentData }] : [] })
      setFeedback({ type: 'success', text: 'Thanks. Feature request sent.' })
      closeTimerRef.current = setTimeout(() => {
        handleClose()
      }, 900)
    } catch (err) {
      console.error('Feature request failed', err)
      setFeedback({ type: 'error', text: 'Could not send request. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: 600, maxWidth: '94%', background: 'white', padding: 20, borderRadius: 12, boxShadow: theme.cardShadow, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Submit a feature request</div>
          <button onClick={handleClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }} aria-label="Close">×</button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short title" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${theme.colors.inputBorder}`, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the feature and why it's useful" rows={6} style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${theme.colors.inputBorder}`, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: theme.colors.muted, marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Attachment (optional, max {MAX_FILE_MB} MB)</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
          {!attachmentName ? (
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                border: `2px dashed ${isDragging ? theme.colors.primary : theme.colors.inputBorder}`,
                background: isDragging ? '#f0fdf4' : '#fafaf8',
                borderRadius: 10,
                padding: '20px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 6, color: isDragging ? theme.colors.primary : theme.colors.muted }}>⬆</div>
              <div style={{ fontSize: 13, color: isDragging ? theme.colors.primary : '#374151', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {isDragging ? 'Drop to attach' : 'Drag & drop a screenshot here, or click to browse'}
              </div>
              {fileError && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{fileError}</div>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              border: `1px solid ${theme.colors.inputBorder}`,
              borderRadius: 10,
              background: '#fafaf8',
            }}>
              {attachmentData && attachmentData.startsWith('data:image/') && (
                <img src={attachmentData} alt="preview" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, fontSize: 13, color: '#374151', fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {attachmentName}
              </div>
              <button
                onClick={removeAttachment}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: theme.colors.muted, fontSize: 16, lineHeight: 1, padding: 2 }}
                aria-label="Remove attachment"
              >×</button>
            </div>
          )}
        </div>

        {feedback ? (
          <div
            style={{
              marginBottom: 12,
              borderRadius: 10,
              padding: '10px 12px',
              border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              background: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: feedback.type === 'success' ? '#166534' : '#991b1b',
              fontSize: 13,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {feedback.text}
          </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${theme.colors.inputBorder}`, background: 'transparent', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ padding: '8px 12px', borderRadius: 10, background: '#16a34a', color: 'white', border: 'none', cursor: 'pointer' }}>{submitting ? 'Sending…' : 'Send request'}</button>
        </div>
      </div>
    </div>
  )
}
