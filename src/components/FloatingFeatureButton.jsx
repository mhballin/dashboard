import React from 'react'
import { theme } from '../styles/theme'

export default function FloatingFeatureButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Request feature"
      style={{
        position: 'fixed',
        right: 20,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        border: 'none',
        boxShadow: theme.shadows.card,
        background: theme.colors.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 20,
        cursor: 'pointer',
        zIndex: 1000,
      }}
    >
      ✨
    </button>
  )
}
