import { useState, useEffect } from "react";
import { SearchStringCard } from "./SearchStringCard";
import { SEARCH_STRINGS, JOB_BOARDS } from "../data/jobBoards";
import { KEYWORDS } from "../data/keywords";

const lbl = {
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9ca3af",
};

export function JobBoardsTab() {
  const [boards, setBoards] = useState(() => {
    try {
      const raw = localStorage.getItem("job-dashboard-boards");
      if (raw) return JSON.parse(raw);
    } catch {}
    return JOB_BOARDS;
  });
  const [editingBoards, setEditingBoards] = useState(false);
  const [searchStrings, setSearchStrings] = useState(() => {
    try {
      const raw = localStorage.getItem("job-dashboard-search-strings");
      if (raw) return JSON.parse(raw);
    } catch {}
    return SEARCH_STRINGS;
  });
  const [editingStrings, setEditingStrings] = useState(false);
  const [keywords, setKeywords] = useState(() => {
    try {
      const raw = localStorage.getItem("job-dashboard-keywords");
      if (raw) {
        const parsed = JSON.parse(raw);
        // Check if it's the new format (array of objects with section and keywords)
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].section && parsed[0].keywords) {
          return parsed;
        }
        // Old format (flat array) - ignore it and use default
      }
    } catch {}
    return Object.entries(KEYWORDS).map(([section, words]) => ({ section, keywords: words }));
  });
  const [editingKeywords, setEditingKeywords] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");

  useEffect(() => {
    localStorage.setItem("job-dashboard-boards", JSON.stringify(boards));
  }, [boards]);

  useEffect(() => {
    localStorage.setItem("job-dashboard-search-strings", JSON.stringify(searchStrings));
  }, [searchStrings]);

  useEffect(() => {
    localStorage.setItem("job-dashboard-keywords", JSON.stringify(keywords));
  }, [keywords]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%", boxSizing: "border-box", padding: "0 24px" }}>
      {/* Job Boards Section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ ...lbl }}>Job Boards</div>
          <button
            onClick={() => setEditingBoards(!editingBoards)}
            style={{
              padding: "4px 12px",
              fontSize: 12,
              borderRadius: 6,
              border: `1px solid ${editingBoards ? "#16a34a" : "#e5e7eb"}`,
              background: "white",
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              color: editingBoards ? "#16a34a" : "#6b7280",
              fontWeight: 500,
            }}
          >
            {editingBoards ? "Done" : "Edit"}
          </button>
        </div>
        
        {boards.map((sec, secIdx) => (
          <div key={sec.section} style={{ marginBottom: 6 }}>
            {/* Category label - compact inline */}
            <div style={{ 
              fontFamily: "'Plus Jakarta Sans',sans-serif", 
              fontSize: 9, 
              fontWeight: 700, 
              letterSpacing: "0.06em", 
              textTransform: "uppercase", 
              color: "#b0b8c1",
              marginBottom: 4,
              marginTop: secIdx === 0 ? 0 : 8,
            }}>
              {sec.section}
            </div>

            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 5 }}>
              {editingBoards ? (
                <>
                  {/* Edit mode cards */}
                  {sec.boards.map((b, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "16px 12px",
                        background: "#fafaf8",
                        borderRadius: 14,
                        border: "1px solid #e5e7eb",
                        minHeight: 80,
                        textAlign: "center",
                      }}
                    >
                      {/* Delete button */}
                      <button
                        onClick={() => {
                          const newBoards = boards.map((s) =>
                            s.section === sec.section
                              ? { ...s, boards: s.boards.filter((_, i) => i !== idx) }
                              : s
                          );
                          setBoards(newBoards);
                        }}
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          fontSize: 14,
                          color: "#ef4444",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          padding: 0,
                        }}
                      >
                        ×
                      </button>

                      {/* Inputs */}
                      <input
                        type="text"
                        value={b.name}
                        onChange={(e) => {
                          const newBoards = boards.map((s) =>
                            s.section === sec.section
                              ? {
                                  ...s,
                                  boards: s.boards.map((board, i) =>
                                    i === idx ? { ...board, name: e.target.value } : board
                                  ),
                                }
                              : s
                          );
                          setBoards(newBoards);
                        }}
                        style={{
                          border: "1px solid #ede9e3",
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          width: "100%",
                          boxSizing: "border-box",
                          marginBottom: 4,
                          outline: "none",
                          background: "white",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      />
                      <input
                        type="text"
                        value={b.url}
                        onChange={(e) => {
                          const newBoards = boards.map((s) =>
                            s.section === sec.section
                              ? {
                                  ...s,
                                  boards: s.boards.map((board, i) =>
                                    i === idx ? { ...board, url: e.target.value } : board
                                  ),
                                }
                              : s
                          );
                          setBoards(newBoards);
                        }}
                        style={{
                          border: "1px solid #ede9e3",
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          width: "100%",
                          boxSizing: "border-box",
                          marginBottom: 4,
                          outline: "none",
                          background: "white",
                          fontSize: 11,
                          color: "#6b7280",
                        }}
                      />
                      <input
                        type="text"
                        value={b.tag}
                        onChange={(e) => {
                          const newBoards = boards.map((s) =>
                            s.section === sec.section
                              ? {
                                  ...s,
                                  boards: s.boards.map((board, i) =>
                                    i === idx ? { ...board, tag: e.target.value } : board
                                  ),
                                }
                              : s
                          );
                          setBoards(newBoards);
                        }}
                        style={{
                          border: "1px solid #ede9e3",
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          width: "100%",
                          boxSizing: "border-box",
                          marginBottom: 0,
                          outline: "none",
                          background: "white",
                          fontSize: 11,
                          color: "#9ca3af",
                        }}
                      />
                    </div>
                  ))}

                  {/* Add Board card */}
                  <div
                    onClick={() => {
                      const newBoards = boards.map((s) =>
                        s.section === sec.section
                          ? { ...s, boards: [...s.boards, { name: "New Board", url: "https://", tag: "" }] }
                          : s
                      );
                      setBoards(newBoards);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "16px 12px",
                      background: "#fafaf8",
                      borderRadius: 14,
                      border: "2px dashed #e5e7eb",
                      minHeight: 80,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 22, color: "#9ca3af", marginBottom: 4 }}>+</div>
                    <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Add Board</div>
                  </div>
                </>
              ) : (
                /* Display mode cards */
                sec.boards.map((b) => {
                  return (
                    <a
                      key={b.name}
                      href={b.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        background: "white",
                        borderRadius: 10,
                        border: "1px solid #ede9e3",
                        textDecoration: "none",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        cursor: "pointer",
                        textAlign: "left",
                        gap: 10,
                        transition: "border-color 0.15s, box-shadow 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#16a34a";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(22,163,74,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#ede9e3";
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "#1a1a1a", fontFamily: "'Plus Jakarta Sans',sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {b.name}
                        </div>
                        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 0, fontFamily: "'Plus Jakarta Sans',sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {b.tag}
                        </div>
                      </div>
                      <img
                        src={(() => { try { return `https://www.google.com/s2/favicons?sz=32&domain=${new URL(b.url).hostname}`; } catch { return ""; } })()}
                        onError={(e) => { e.target.style.display = "none"; }}
                        style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0 }}
                        alt=""
                      />
                    </a>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Search Strings Section */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ ...lbl }}>Search Strings</div>
          <button
            onClick={() => setEditingStrings(!editingStrings)}
            style={{
              padding: "4px 12px",
              fontSize: 12,
              borderRadius: 6,
              border: `1px solid ${editingStrings ? "#16a34a" : "#e5e7eb"}`,
              background: "white",
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              color: editingStrings ? "#16a34a" : "#6b7280",
              fontWeight: 500,
            }}
          >
            {editingStrings ? "Done" : "Edit"}
          </button>
        </div>
        {searchStrings.map((s, i) => (
          <SearchStringCard
            key={i}
            s={s}
            isEditing={editingStrings}
            onUpdate={(updated) => {
              const next = [...searchStrings];
              next[i] = updated;
              setSearchStrings(next);
            }}
            onDelete={() => setSearchStrings(searchStrings.filter((_, idx) => idx !== i))}
          />
        ))}
        {editingStrings && (
          <button
            onClick={() =>
              setSearchStrings([
                ...searchStrings,
                { label: "New Search String", query: "", tip: "" },
              ])
            }
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px dashed #e5e7eb",
              background: "#fafaf8",
              cursor: "pointer",
              fontSize: 13,
              color: "#6b7280",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              width: "100%",
              marginTop: 4,
            }}
          >
            + Add Search String
          </button>
        )}
      </div>

      {/* Keywords Section */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ ...lbl }}>Keywords Reference</div>
          <button
            onClick={() => setEditingKeywords(!editingKeywords)}
            style={{
              padding: "4px 12px",
              fontSize: 12,
              borderRadius: 6,
              border: `1px solid ${editingKeywords ? "#16a34a" : "#e5e7eb"}`,
              background: "white",
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              color: editingKeywords ? "#16a34a" : "#6b7280",
              fontWeight: 500,
            }}
          >
            {editingKeywords ? "Done" : "Edit"}
          </button>
        </div>

        {/* Keyword Sections */}
        {keywords.map((sec, secIdx) => (
          <div key={sec.section} style={{ marginBottom: 6 }}>
            {/* Category label - compact inline */}
            <div style={{ 
              fontFamily: "'Plus Jakarta Sans',sans-serif", 
              fontSize: 9, 
              fontWeight: 700, 
              letterSpacing: "0.06em", 
              textTransform: "uppercase", 
              color: "#b0b8c1",
              marginBottom: 4,
              marginTop: secIdx === 0 ? 0 : 8,
            }}>
              {sec.section}
            </div>

            {/* Keyword Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 5 }}>
              {sec.keywords.map((keyword, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 10px",
                    background: "white",
                    borderRadius: 10,
                    border: "1px solid #ede9e3",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    textAlign: "left",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (editingKeywords) {
                      e.currentTarget.style.borderColor = "#ef4444";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(239,68,68,0.1)";
                    } else {
                      e.currentTarget.style.borderColor = "#16a34a";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(22,163,74,0.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#ede9e3";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontWeight: 600,
                      fontSize: 12,
                      color: "#1a1a1a",
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {keyword}
                  </span>
                  {editingKeywords && (
                    <button
                      onClick={() => {
                        const newKeywords = keywords.map((s) =>
                          s.section === sec.section
                            ? { ...s, keywords: s.keywords.filter((_, i) => i !== idx) }
                            : s
                        );
                        setKeywords(newKeywords);
                      }}
                      style={{
                        fontSize: 14,
                        color: "#ef4444",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        marginLeft: 8,
                        flexShrink: 0,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Add Keyword Input (edit mode only) */}
        {editingKeywords && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newKeyword.trim()) {
                  // Add to the last section (Skills Keywords)
                  const newKeywords = [...keywords];
                  const lastSection = newKeywords[newKeywords.length - 1];
                  lastSection.keywords = [...lastSection.keywords, newKeyword.trim()];
                  setKeywords(newKeywords);
                  setNewKeyword("");
                }
              }}
              placeholder="Add keyword..."
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 12,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                outline: "none",
                flex: 1,
              }}
            />
            <button
              onClick={() => {
                if (newKeyword.trim()) {
                  // Add to the last section (Skills Keywords)
                  const newKeywords = [...keywords];
                  const lastSection = newKeywords[newKeywords.length - 1];
                  lastSection.keywords = [...lastSection.keywords, newKeyword.trim()];
                  setKeywords(newKeywords);
                  setNewKeyword("");
                }
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                background: "#16a34a",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontWeight: 600,
              }}
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
