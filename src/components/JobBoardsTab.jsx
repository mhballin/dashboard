import { useState } from "react";
import { JobBoardsSetup } from "./JobBoardsSetup";
import { SearchStringCard } from "./SearchStringCard";
import { theme } from "../styles/theme";

export function JobBoardsTab({
  jobBoards,
  onSetJobBoards,
  searchStrings,
  onSetSearchStrings,
  keywords,
  onSetKeywords,
  isSetupComplete,
  onSetupComplete,
}) {
  const [editingBoards, setEditingBoards] = useState(false);
  const [editingStrings, setEditingStrings] = useState(false);
  const [editingKeywords, setEditingKeywords] = useState(false);

  const boards = Array.isArray(jobBoards) ? jobBoards : [];
  const strings = Array.isArray(searchStrings) ? searchStrings : [];
  const keywordSections = Array.isArray(keywords) ? keywords : [];

  // styles (migrated to theme tokens)
  const container = { maxWidth: 900, margin: "0 auto", width: "100%", boxSizing: "border-box", padding: `0 ${theme.space[6]}px` };
  const sectionWrap = { marginBottom: 20 };
  const headerRow = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 };
  const lbl = { fontFamily: theme.fonts.ui, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: theme.colors.muted };
  const toggleBtn = (on) => ({ padding: "6px 12px", fontSize: 12, borderRadius: theme.radii.default, border: `1px solid ${on ? theme.colors.primary : theme.colors.inputBorder}`, background: theme.colors.cardBg, cursor: "pointer", fontFamily: theme.fonts.ui, color: on ? theme.colors.primary : theme.colors.muted, fontWeight: 600 });

  // Local states for keyword UI
  const [chipFlash, setChipFlash] = useState({}); // key: `${secIndex}-${kwIndex}` => true
  const [sectionCopied, setSectionCopied] = useState({});
  const [addInput, setAddInput] = useState("");
  const [addTargetSection, setAddTargetSection] = useState(0);
  const [newSectionName, setNewSectionName] = useState("");
  const [editingSectionLabel, setEditingSectionLabel] = useState({});

  // Board section collapse state
  const [openSections, setOpenSections] = useState(() => boards.map(() => true));

  // If setup not complete, show onboarding
  if (!isSetupComplete) {
    return (
      <div style={container}>
        <JobBoardsSetup
          onComplete={(roleId) => onSetupComplete && onSetupComplete(roleId)}
        />
      </div>
    );
  }

  // Helpers for job boards edits
  function updateBoard(secIndex, boardIndex, patch) {
    const next = boards.map((s, si) => (si === secIndex ? { ...s, boards: s.boards.map((b, bi) => (bi === boardIndex ? { ...b, ...patch } : b)) } : s));
    onSetJobBoards?.(next);
  }

  function addBoard(secIndex) {
    const next = boards.map((s, si) => (si === secIndex ? { ...s, boards: [...s.boards, { name: "New Board", url: "https://", tag: "" }] } : s));
    onSetJobBoards?.(next);
  }

  function deleteBoard(secIndex, boardIndex) {
    const next = boards.map((s, si) => (si === secIndex ? { ...s, boards: s.boards.filter((_, i) => i !== boardIndex) } : s));
    onSetJobBoards?.(next);
  }

  // Keywords helpers
  function addKeywordToSection(secIndex, value) {
    const val = value.trim();
    if (!val) return;
    const next = keywordSections.map((s, si) => (si === secIndex ? { ...s, keywords: [...s.keywords, val] } : s));
    onSetKeywords?.(next);
  }

  function deleteKeyword(secIndex, kwIndex) {
    const next = keywordSections.map((s, si) => (si === secIndex ? { ...s, keywords: s.keywords.filter((_, i) => i !== kwIndex) } : s));
    onSetKeywords?.(next);
  }

  function addSection(name) {
    if (!name || !name.trim()) return;
    const next = [...keywordSections, { section: name.trim(), keywords: [] }];
    onSetKeywords?.(next);
  }

  function renameSection(secIndex, name) {
    const next = keywordSections.map((s, si) => (si === secIndex ? { ...s, section: name } : s));
    onSetKeywords?.(next);
  }
  // Copy helpers
  function copyText(text) {
    try {
      navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  function handleCopyChip(secIndex, kwIndex, text) {
    copyText(text);
    const key = `${secIndex}-${kwIndex}`;
    setChipFlash((s) => ({ ...s, [key]: true }));
    setTimeout(() => setChipFlash((s) => ({ ...s, [key]: false })), 1000);
  }

  function handleCopyAll(secIndex) {
    const list = (keywordSections[secIndex]?.keywords || []).join(", ");
    copyText(list);
    setSectionCopied((s) => ({ ...s, [secIndex]: true }));
    setTimeout(() => setSectionCopied((s) => ({ ...s, [secIndex]: false })), 1500);
  }

  // Reset link triggers setup flow
  function handleReset() {
    onSetupComplete && onSetupComplete("__reset__");
  }
  function toggleSection(i) {
    setOpenSections((s) => s.map((v, idx) => (idx === i ? !v : v)));
  }

  return (
    <div style={container}>
      {/* Job Boards Section */}
      <div style={sectionWrap}>
        <div style={headerRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={lbl}>Job Boards</div>
            <div style={{ background: theme.colors.subtle, padding: `${theme.space[1]}px ${theme.space[3]}px`, borderRadius: 999, fontSize: 12, color: theme.colors.muted }}>{boards.reduce((acc, s) => acc + (Array.isArray(s.boards) ? s.boards.length : 0), 0)}</div>
          </div>
          <button onClick={() => setEditingBoards(!editingBoards)} style={toggleBtn(editingBoards)}>{editingBoards ? "Done" : "Edit"}</button>
        </div>

        {/* Sections */}
        {boards.map((sec, secIdx) => (
          <div key={sec.section} style={{ marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", paddingBottom: 3, borderBottom: `1px solid ${theme.colors.border}`, marginBottom: theme.space[1] }} onClick={() => toggleSection(secIdx)}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: theme.colors.muted }}>{openSections[secIdx] ? "▾" : "▸"} <span style={{ marginLeft: theme.space[1] }}>{sec.section}</span></div>
                <div style={{ background: theme.colors.subtle, padding: `${theme.space[0]}px ${theme.space[3]}px`, borderRadius: 999, fontSize: 11, color: theme.colors.muted }}>{sec.boards.length}</div>
              </div>
            </div>

            {openSections[secIdx] && (
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 5 }}>
                {editingBoards ? (
                  <>
                    {sec.boards.map((b, idx) => (
                      <div key={idx} style={{ background: theme.colors.subtle, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.default, padding: "8px 10px", boxSizing: "border-box", minHeight: 80, position: "relative" }}>
                        <button onClick={() => deleteBoard(secIdx, idx)} style={{ position: "absolute", right: theme.space[3], top: theme.space[2], background: "none", border: "none", color: theme.colors.dangerText || '#ef4444', cursor: "pointer", fontSize: 16 }}>×</button>
                        <input value={b.name} onChange={(e) => updateBoard(secIdx, idx, { name: e.target.value })} style={{ width: "100%", fontWeight: 700, fontSize: 14, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.default, padding: "6px 8px", marginBottom: 6, fontFamily: theme.fonts.ui }} />
                        <input value={b.url} onChange={(e) => updateBoard(secIdx, idx, { url: e.target.value })} style={{ width: "100%", fontSize: 12, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.default, padding: "6px 8px", marginBottom: 6, fontFamily: theme.fonts.ui, color: theme.colors.muted }} />
                        <input value={b.tag} onChange={(e) => updateBoard(secIdx, idx, { tag: e.target.value })} style={{ width: "100%", fontSize: 12, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.default, padding: "6px 8px", fontFamily: theme.fonts.ui, color: theme.colors.muted }} />
                      </div>
                    ))}

                    <div onClick={() => addBoard(secIdx)} style={{ display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${theme.colors.inputBorder}`, borderRadius: theme.radii.default, background: theme.colors.subtle, padding: "8px 10px", cursor: "pointer" }}>+ Add Board</div>
                  </>
                ) : (
                  sec.boards.map((b, idx) => (
                    <a key={idx} href={b.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: theme.colors.cardBg, borderRadius: theme.radii.default, border: `1px solid ${theme.colors.border}`, textDecoration: "none", transition: "box-shadow 0.15s, border-color 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.colors.primary; e.currentTarget.style.boxShadow = theme.shadows.card; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.colors.border; e.currentTarget.style.boxShadow = "none"; }}>
                      <div style={{ width: 24, height: 24, flexShrink: 0 }}>
                        <img src={(() => { try { return `https://www.google.com/s2/favicons?sz=32&domain=${new URL(b.url).hostname}`; } catch { return ""; } })()} onError={(e) => { e.currentTarget.style.display = "none"; }} alt="" style={{ width: 16, height: 16 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: theme.colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: theme.fonts.ui }}>{b.name}</div>
                        <div style={{ fontSize: 12, color: theme.colors.muted, fontFamily: theme.fonts.ui }}>{b.tag}</div>
                      </div>
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Keywords & Phrases */}
      <div style={sectionWrap}>
        <div style={headerRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={lbl}>Keywords & Phrases</div>
            <div style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: 999, fontSize: 12, color: "#6b7280" }}>{keywordSections.reduce((acc, s) => acc + (Array.isArray(s.keywords) ? s.keywords.length : 0), 0)}</div>
          </div>
          <button onClick={() => setEditingKeywords(!editingKeywords)} style={toggleBtn(editingKeywords)}>{editingKeywords ? "Done" : "Edit"}</button>
        </div>

        {/* Sections */}
        {keywordSections.map((sec, secIdx) => (
          <div key={sec.section} style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {editingSectionLabel[secIdx] ? (
                  <input autoFocus value={editingSectionLabel[secIdx]} onChange={(e) => setEditingSectionLabel((s) => ({ ...s, [secIdx]: e.target.value }))} onBlur={() => { renameSection(secIdx, editingSectionLabel[secIdx] || sec.section); setEditingSectionLabel((s) => { const copy = { ...s }; delete copy[secIdx]; return copy; }); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: '1px solid #ede9e3' }} />
                ) : (
                  <div onDoubleClick={() => setEditingSectionLabel((s) => ({ ...s, [secIdx]: sec.section }))} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#b0b8c1' }}>{sec.section}</div>
                )}

                <button onClick={() => handleCopyAll(secIdx)} style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>{sectionCopied[secIdx] ? 'Copied!' : 'Copy all'}</button>
              </div>
              {editingKeywords && sec.keywords.length === 0 && (
                <button onClick={() => { const next = keywordSections.filter((_, i) => i !== secIdx); onSetKeywords?.(next); }} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {sec.keywords.map((kw, kwIdx) => {
                const key = `${secIdx}-${kwIdx}`;
                const flash = !!chipFlash[key];
                const palette = [
                  { bg: '#dbeafe', text: '#1e40af' },
                  { bg: '#e0e7ff', text: '#3730a3' },
                  { bg: '#fce7f3', text: '#9d174d' },
                  { bg: '#d1fae5', text: '#065f46' },
                  { bg: '#fef3c7', text: '#92400e' },
                  { bg: '#e5e7eb', text: '#374151' },
                ];
                const p = palette[secIdx] || { bg: '#f3e8ff', text: '#6b21a8' };
                return (
                  <div key={key} onClick={() => { if (!editingKeywords) handleCopyChip(secIdx, kwIdx, kw); }} style={{ display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 12px', borderRadius: 15, fontSize: 12, fontWeight: 500, fontFamily: "'Plus Jakarta Sans',sans-serif", background: flash ? '#dcfce7' : p.bg, color: p.text, border: `1px solid ${p.text}33`, cursor: editingKeywords ? 'default' : 'pointer' }}>
                    {flash ? '✓' : kw}
                    {editingKeywords && (
                      <button onClick={(e) => { e.stopPropagation(); deleteKeyword(secIdx, kwIdx); }} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
                    )}
                  </div>
                );
              })}

              {/* Add input (edit mode) */}
              {editingKeywords && (
                <div style={{ display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 8px', borderRadius: 15, border: '1px solid #e5e7eb', background: '#ffffff' }}>
                  <select value={addTargetSection} onChange={(e) => setAddTargetSection(Number(e.target.value))} style={{ border: 'none', background: 'transparent', fontSize: 12, marginRight: 6 }}>
                    {keywordSections.map((s, i) => <option key={s.section} value={i}>{s.section}</option>)}
                  </select>
                  <input placeholder="Add keyword..." value={addInput} onChange={(e) => setAddInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (addInput.trim()) { addKeywordToSection(addTargetSection, addInput.trim()); setAddInput(''); } } }} style={{ border: 'none', outline: 'none', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12 }} />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add section UI */}
        {editingKeywords && (
          <div style={{ marginTop: 6 }}>
            {newSectionName ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input autoFocus value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { addSection(newSectionName); setNewSectionName(''); } }} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #ede9e3' }} />
                <button onClick={() => { addSection(newSectionName); setNewSectionName(''); }} style={{ padding: '6px 10px', borderRadius: 8, background: '#16a34a', color: 'white', border: 'none' }}>Add</button>
                <button onClick={() => setNewSectionName('')} style={{ padding: '6px 10px', borderRadius: 8, background: 'none', border: '1px solid #e5e7eb' }}>Cancel</button>
              </div>
            ) : (
              <div onClick={() => setNewSectionName('New Section')} style={{ display: 'inline-block', padding: '8px 12px', borderRadius: 10, border: '1px dashed #e5e7eb', cursor: 'pointer', color: '#6b7280' }}>+ Add section</div>
            )}
          </div>
        )}
      </div>

      {/* Search Strings */}
      <div style={sectionWrap}>
        <div style={headerRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={lbl}>Search Strings</div>
            <div style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 999, fontSize: 12, color: '#6b7280' }}>{strings.length}</div>
          </div>
          <button onClick={() => setEditingStrings(!editingStrings)} style={toggleBtn(editingStrings)}>{editingStrings ? 'Done' : 'Edit'}</button>
        </div>

        <div>
          {strings.map((s, i) => (
            <SearchStringCard key={i} s={s} isEditing={editingStrings} onUpdate={(updated) => { const next = [...strings]; next[i] = updated; onSetSearchStrings?.(next); }} onDelete={() => onSetSearchStrings?.(strings.filter((_, idx) => idx !== i))} />
          ))}

          {editingStrings && (
            <div onClick={() => onSetSearchStrings?.([...strings, { label: 'New Search String', query: '', tip: '' }])} style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, border: '1px dashed #e5e7eb', background: '#fafaf8', cursor: 'pointer', color: '#6b7280' }}>+ Add Search String</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', fontSize: 11 }}>
        <div />
        <div>
          <a onClick={handleReset} style={{ color: '#9ca3af', textDecoration: 'underline', cursor: 'pointer' }}>Reset to defaults</a>
        </div>
      </div>
    </div>
  );
}
