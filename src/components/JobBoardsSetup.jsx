import { useState } from "react";
import { ROLE_OPTIONS } from "../data/roleTemplates";
import { theme, cardStyle } from "../styles/theme";

export function JobBoardsSetup({ onComplete }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [hovered, setHovered] = useState(null);

  const outerCard = {
    ...cardStyle(),
    fontFamily: theme.fonts.ui,
    maxWidth: 440,
    margin: `${theme.space[7]}px auto`,
    padding: theme.space[5],
    color: theme.colors.text,
  };

  const headingStyle = {
    margin: 0,
    marginBottom: theme.space[2],
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: 700,
    lineHeight: '1.25',
    fontFamily: theme.fonts.ui,
  };

  const subtextStyle = {
    margin: 0,
    marginBottom: theme.space[4],
    color: '#6b7280',
    fontSize: 14,
    fontWeight: 400,
    fontFamily: theme.fonts.ui,
  };

  const roleRowBase = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '12px 14px',
    marginBottom: theme.space[2],
    borderRadius: theme.radii.default,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.cardBg,
    color: theme.colors.text,
    cursor: 'pointer',
    transition: 'box-shadow 150ms ease, transform 120ms ease',
    outline: 'none',
  };

  function getRoleRowStyle(role, idx) {
    const selected = selectedRole === role.id;
    const isHovered = hovered === idx;
    return {
      ...roleRowBase,
      background: selected ? '#f0fdf4' : theme.colors.cardBg,
      border: selected ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.border}`,
      color: selected ? theme.colors.primary : theme.colors.text,
      boxShadow: isHovered ? '0 6px 18px rgba(15,23,42,0.06)' : 'none',
      transform: isHovered ? 'translateY(-2px)' : 'none',
      borderLeft: selected ? '6px solid rgba(22,163,74,0.12)' : '1px solid transparent',
      paddingLeft: selected ? 12 : 14,
    };
  }

  const customStyle = {
    fontSize: 13,
    fontStyle: 'italic',
    color: theme.colors.muted,
    background: theme.colors.cardBg,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radii.default,
    padding: '10px 14px',
    cursor: 'pointer',
    marginTop: theme.space[1],
    transition: 'box-shadow 150ms ease',
    fontFamily: theme.fonts.ui,
  };

  const footerStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: theme.space[3],
  };

  const primaryBtn = (enabled) => ({
    background: theme.colors.primary,
    color: '#ffffff',
    border: 'none',
    padding: '10px 14px',
    borderRadius: theme.radii.default,
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontWeight: 600,
    fontSize: 13,
    width: '100%',
    fontFamily: theme.fonts.ui,
  });

  return (
    <div style={outerCard}>
      <h2 style={headingStyle}>Set up your job search toolkit</h2>
      <p style={subtextStyle}>
        Pick your target role and we'll pre-populate boards, keywords, and search strings you can customize.
      </p>

      <div>
        {ROLE_OPTIONS.map((role, idx) => {
          const isCustom = role.id === 'custom';
            if (isCustom) {
            // Render custom at bottom but keep it part of list
            return (
              <div
                key={role.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRole(role.id)}
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
                  style={{ ...customStyle, ...(selectedRole === role.id ? { border: `2px solid ${theme.colors.primary}`, color: theme.colors.primary, background: '#f0fdf4' } : {}) }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13 }}>{role.label}</span>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={role.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedRole(role.id)}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              style={getRoleRowStyle(role, idx)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: selectedRole === role.id ? theme.colors.primary : 'transparent', border: selectedRole === role.id ? 'none' : '1px solid transparent' }} />
                  <div style={{ fontSize: 15, fontFamily: theme.fonts.ui }}>{role.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={footerStyle}>
        <button
          type="button"
          onClick={() => selectedRole && onComplete && onComplete(selectedRole)}
          disabled={!selectedRole}
          style={primaryBtn(!!selectedRole)}
        >
          Set up my page →
        </button>
      </div>
    </div>
  );
}
