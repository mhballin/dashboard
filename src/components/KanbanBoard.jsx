import { useState } from "react";
import { Plus, Trash2, Globe } from "lucide-react";
import { KANBAN_COLS } from "../data/kanbanCols";
import { todayStr } from "../utils/dates";
import { theme, cardStyle as themeCardStyle } from "../styles/theme";
import KanbanModal from "./kanban/KanbanModal";

const lbl = {
  fontFamily: theme.fonts.ui,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: theme.colors.muted,
};

const cardFont = {
  fontFamily: theme.fonts.ui,
};

const STALE_THRESHOLD_DAYS = 14;
const BOARD_MAX_WIDTH = 1480;

const staleBadgeStyle = {
  position: "absolute",
  top: 8,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 18,
  height: 16,
  padding: "0 4px",
  borderRadius: 999,
  border: "1px solid #fecaca",
  background: "#fff1f2",
  fontSize: 10,
  fontWeight: 800,
  color: "#dc2626",
  fontFamily: theme.fonts.ui,
  letterSpacing: "-0.02em",
  lineHeight: 1,
  boxSizing: "border-box",
};

const savedStarButtonStyle = {
  flexShrink: 0,
  width: 20,
  height: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 1,
  padding: 0,
  background: "none",
  border: "none",
  fontSize: 16,
  lineHeight: 1,
  color: theme.colors.border,
  cursor: "pointer",
};

const isStaleCard = (card) => {
  if (card.col !== 'saved') return false;
  const stageDate = card.dates?.saved || card.added;
  if (!stageDate) return false;
  const diffMs = Date.now() - new Date(stageDate).getTime();
  return diffMs > STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
};

export function KanbanBoard({ cards, setCards, onLog, onCardCreate, onCardUpdate, onCardDelete }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCol, setModalCol] = useState(null);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'view', 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    company: "",
    title: "",
    location: "",
    description: "",
    url: "",
    notes: "",
  });
  const [validation, setValidation] = useState({ company: "", title: "" });
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isImportPanelOpen, setIsImportPanelOpen] = useState(false);

  const getDomainFromUrl = (url) => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  };

  const getCompanyLogo = (companyName, url) => {
    // Prefer extracting domain from the job posting URL
    if (url) {
      const domain = getDomainFromUrl(url);
      if (domain) return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
    }

    // Fall back to guessing domain from company name
    if (!companyName) return null;
    const cleaned = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    return `https://www.google.com/s2/favicons?sz=128&domain=${cleaned}.com`;
  };

  const getCompanyInitial = (companyName) => {
    if (!companyName) return '?';
    return companyName.charAt(0).toUpperCase();
  };

  const getCompanyColor = (companyName) => {
    if (!companyName) return theme.colors.muted;
    
    // Generate a consistent color based on the company name
    const colors = [
      '#3b82f6', // blue
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#f59e0b', // amber
      '#10b981', // green
      '#06b6d4', // cyan
      '#ef4444', // red
      '#6366f1', // indigo
    ];
    
    const hash = companyName.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const openModal = (colId) => {
    setEditingId(null);
    setModalCol(colId);
    setModalMode('create');
    setValidation({ company: "", title: "" });
    setFormData({
      company: "",
      title: "",
      location: "",
      description: "",
      url: "",
      notes: "",
    });
    setModalOpen(true);
    setIsImportPanelOpen(false);
  };

  const saveImportedCard = ({ company, title, location, description, url }) => {
    if (!company && !title) return;

    const today = todayStr();
    const dates = { saved: today, applied: null, interviewing: null, closed: null };
    const newCard = {
      id: Date.now(),
      col: modalCol,
      company,
      title,
      location,
      description,
      url,
      notes: "",
      added: today,
      dates,
      isHighPriority: false,
      priorityOrder: Date.now(),
      isStarred: false,
    };

    setCards((p) => [...p, newCard]);
    onCardCreate?.(newCard);
    setIsImportPanelOpen(false);
    setModalOpen(false);
    setModalCol(null);
  };

  const openEditModal = (card) => {
    setEditingId(card.id);
    setModalCol(card.col);
    setModalMode('view');
    setValidation({ company: "", title: "" });
    setFormData({
      company: card.company || "",
      title: card.title || "",
      location: card.location || "",
      description: card.description || "",
      url: card.url || "",
      notes: card.notes || "",
    });
    setModalOpen(true);
  };

  const switchToEditMode = () => {
    setModalMode('edit');
  };

  const switchToViewMode = () => {
    setModalMode('view');
  };

  const updateNotes = () => {
    if (editingId !== null) {
      setCards((p) =>
        p.map((c) =>
          c.id === editingId
            ? { ...c, notes: formData.notes.trim() }
            : c
        )
      );
      onCardUpdate?.(editingId, { notes: formData.notes.trim() });
    }
  };

  const saveJob = () => {
    const nextValidation = {
      company: formData.company.trim() ? "" : "Company is required",
      title: formData.title.trim() ? "" : "Title is required",
    };

    setValidation(nextValidation);

    if (nextValidation.company || nextValidation.title) {
      return;
    }

    setValidation({ company: "", title: "" });
    
    if (editingId !== null) {
      // Update existing job
      setCards((p) =>
        p.map((c) =>
          c.id === editingId
            ? {
                ...c,
                col: modalCol,
                company: formData.company.trim(),
                title: formData.title.trim(),
                location: formData.location.trim(),
                description: formData.description.trim(),
                url: formData.url.trim(),
                notes: formData.notes.trim(),
              }
            : c
        )
      );
      onCardUpdate?.(editingId, {
        col: modalCol,
        company: formData.company.trim(),
        title: formData.title.trim(),
        location: formData.location.trim(),
        description: formData.description.trim(),
        url: formData.url.trim(),
        notes: formData.notes.trim(),
      });
      // If in edit mode, switch back to view mode instead of closing
      if (modalMode === 'edit') {
        setModalMode('view');
      } else {
        setModalOpen(false);
        setEditingId(null);
        setModalCol(null);
      }
    } else {
      // Create new job
      const today = todayStr();
      const dates = {
        saved: today,
        applied: null,
        interviewing: null,
        closed: null,
      };
      if (modalCol === "applied") {
        dates.applied = today;
      } else if (modalCol === "interviewing") {
        dates.applied = today;
        dates.interviewing = today;
      } else if (modalCol === "closed") {
        dates.closed = today;
      }
      const newCard = {
        id: Date.now(),
        col: modalCol,
        company: formData.company.trim(),
        title: formData.title.trim(),
        location: formData.location.trim(),
        description: formData.description.trim(),
        url: formData.url.trim(),
        notes: formData.notes.trim(),
        added: today,
        dates,
        isHighPriority: false,
        priorityOrder: Date.now(),
        isStarred: false,
      };
      setCards((p) => [
        ...p,
        newCard,
      ]);
      onCardCreate?.(newCard);
      if (["applied", "interviewing", "closed"].includes(modalCol)) {
        onLog?.({
          date: today,
          type: modalCol,
          note: `${newCard.company || newCard.title} — ${newCard.title}`,
        });
      }
      setModalOpen(false);
      setEditingId(null);
      setModalCol(null);
    }
  };

  const move = (id, col) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    const targetCol = col;
    const sourceCol = card.col;

    // Compute updated dates for the moved card
    const updatedDates = { ...(card.dates || { saved: card.added || todayStr(), applied: null, interviewing: null, closed: null }) };
    if (col === "applied") {
      updatedDates.applied = todayStr();
    } else if (col === "interviewing") {
      updatedDates.interviewing = todayStr();
    } else if (col === "closed") {
      updatedDates.closed = todayStr();
    } else if (col === "saved" && !updatedDates.saved) {
      updatedDates.saved = todayStr();
    }

    setCards((p) =>
      p.map((c) => (c.id === id ? { ...c, col, dates: updatedDates } : c))
    );

    const trackedCols = ["applied", "interviewing", "closed"];
    if (sourceCol !== targetCol && trackedCols.includes(targetCol)) {
      onLog?.({
        date: todayStr(),
        type: targetCol,
        note: `${card.company || card.title} — ${card.title}`,
      });
    }

    onCardUpdate?.(id, { col, dates: updatedDates });
  };
  const remove = (id) => {
    setCards((p) => p.filter((c) => c.id !== id));
    onCardDelete?.(id);
  };

  const handleDragStart = (e, cardId) => {
    setDragging(cardId);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
    setIsDragging(false);
  };

  const handleCardClick = (card) => {
    if (!isDragging) {
      openEditModal(card);
    }
  };

  const getSectionDropStyle = (section) => {
    const draggedCard = cards.find((card) => card.id === dragging);
    const isSavedDrag = draggedCard && draggedCard.col === "saved";
    const canDropToPriority = isSavedDrag && draggedCard.isHighPriority !== true;
    const canDropToOthers = isSavedDrag && draggedCard.isHighPriority === true;
    const canDrop = section === "priority" ? canDropToPriority : canDropToOthers;

    return {
      minHeight: 72,
      padding: "4px 4px 2px",
      borderRadius: 10,
      border: canDrop ? "1px dashed #d6d1c8" : "1px dashed transparent",
      background: canDrop ? "#f8f6f2" : "transparent",
      transition: "all 0.15s",
    };
  };

  return (
    <div style={{ width: "100%", maxWidth: BOARD_MAX_WIDTH, margin: "0 auto" }}>
      <div style={{ ...lbl, marginBottom: 18 }}>Job Tracker</div>

      {/* Kanban Columns */}
      <div style={{ width: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, alignItems: "start", width: "100%" }}>
        {KANBAN_COLS.map((col) => {
          let colCards = cards.filter((c) => c.col === col.id);
          
          // For saved column, split into high and low priority sections
          let highCards = [];
          let lowCards = [];
          if (col.id === "saved") {
            highCards = colCards.filter((c) => c.isHighPriority === true).sort((a, b) => a.priorityOrder - b.priorityOrder);
            lowCards = colCards.filter((c) => c.isHighPriority !== true).sort((a, b) => a.priorityOrder - b.priorityOrder);
          }
          
          const isOver = dragOver === col.id;
            return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging !== null) move(dragging, col.id);
                setDragging(null);
                setDragOver(null);
                setIsDragging(false);
              }}
              onDragLeave={() => setDragOver(null)}
              style={{
                background: isOver ? col.bg : theme.colors.subtle,
                borderRadius: 18,
                padding: 16,
                minHeight: 240,
                border: `1.5px solid ${isOver ? col.color + "50" : theme.colors.border}`,
                transition: "all 0.15s",
                minWidth: 0,
                width: "100%",
                boxSizing: "border-box",
                boxShadow: isOver ? "0 6px 18px rgba(0,0,0,0.05)" : "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }} />
                  <span style={{ ...cardFont, fontSize: 13, fontWeight: 700, color: theme.colors.text }}>
                    {col.label}
                  </span>
                  <span style={{ ...cardFont, fontSize: 11, color: theme.colors.muted }}>
                    ({colCards.length})
                  </span>
                </div>
                <button
                  onClick={() => openModal(col.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: theme.colors.muted, display: "flex", padding: 2 }}
                >
                  <Plus size={15} />
                </button>
                {/* Import button removed from column header — now available in the Add modal */}
              </div>

              {/* Job Cards - Different rendering for saved column */}
                {col.id === "saved" ? (
                <>
                  {/* Priority Label */}
                  <div style={{ fontSize: 10, color: theme.colors.muted, letterSpacing: "0.5px", textTransform: "uppercase", fontFamily: theme.fonts.ui, marginBottom: 8, marginLeft: 4 }}>
                    PRIORITY
                  </div>

                  {/* High Priority Section */}
                  <div
                    style={getSectionDropStyle("priority")}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragging !== null) {
                        const draggedCard = cards.find((card) => card.id === dragging);
                        if (draggedCard && draggedCard.col === "saved" && draggedCard.isHighPriority !== true) {
                          const po = Date.now();
                          setCards((p) =>
                            p.map((card) =>
                              card.id === dragging
                                ? { ...card, isHighPriority: true, priorityOrder: po }
                                : card
                            )
                          );
                          onCardUpdate?.(dragging, { isHighPriority: true, priorityOrder: po });
                        }
                      }
                      setDragging(null);
                      setDragOver(null);
                      setIsDragging(false);
                    }}
                  >
                  {highCards.map((c) => {
                    return (
                      <div
                            key={c.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, c.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOver(c.id);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (dragging !== null) {
                                const draggedCard = cards.find((card) => card.id === dragging);
                                if (draggedCard && draggedCard.col !== "saved") {
                                  move(dragging, "saved");
                                } else if (draggedCard && draggedCard.col === "saved" && dragging !== c.id) {
                                  if (draggedCard.isHighPriority === true) {
                                    const draggedOrder = draggedCard.priorityOrder;
                                    const targetOrder = c.priorityOrder;
                                    setCards((p) =>
                                      p.map((card) => {
                                        if (card.id === dragging) {
                                          return { ...card, priorityOrder: targetOrder };
                                        }
                                        if (card.id === c.id) {
                                          return { ...card, priorityOrder: draggedOrder };
                                        }
                                        return card;
                                      })
                                    );
                                    onCardUpdate?.(dragging, { priorityOrder: targetOrder });
                                    onCardUpdate?.(c.id, { priorityOrder: draggedOrder });
                                  } else {
                                    const po = Date.now();
                                    setCards((p) =>
                                      p.map((card) =>
                                        card.id === dragging
                                          ? { ...card, isHighPriority: false, priorityOrder: po }
                                          : card
                                      )
                                    );
                                    onCardUpdate?.(dragging, { isHighPriority: false, priorityOrder: po });
                                  }
                                }
                              }
                              setDragging(null);
                              setDragOver(null);
                              setIsDragging(false);
                            }}
                            onClick={() => handleCardClick(c)}
                            onMouseEnter={() => setHoveredCardId(c.id)}
                            onMouseLeave={() => setHoveredCardId(null)}
                            style={{
                              ...themeCardStyle(),
                              borderRadius: 12,
                              padding: "10px 14px",
                              marginBottom: 8,
                              borderLeft: "3.5px solid #c96b5a",
                              boxShadow: hoveredCardId === c.id ? "0 4px 12px rgba(0,0,0,0.1)" : "0 1px 3px rgba(0,0,0,0.04)",
                              cursor: "pointer",
                              userSelect: "none",
                              opacity: dragging === c.id ? 0.5 : 1,
                              transform: hoveredCardId === c.id ? "translateY(-2px)" : "translateY(0)",
                              transition: "all 0.2s ease",
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                        {isStaleCard(c) && (
                          <div
                            style={{
                              ...staleBadgeStyle,
                              right: 10,
                            }}
                          >
                            !!
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCards((p) =>
                                  p.map((card) =>
                                    card.id === c.id
                                      ? { ...card, isStarred: !card.isStarred }
                                      : card
                                  )
                                );
                                onCardUpdate?.(c.id, { isStarred: !c.isStarred });
                              }}
                              style={{
                                ...savedStarButtonStyle,
                                color: c.isStarred ? "#d4a537" : "#c5c0b8",
                              }}
                              aria-label={c.isStarred ? "Unstar job" : "Star job"}
                            >
                              {c.isStarred ? "★" : "☆"}
                            </button>
                            {/* Company Icon */}
                            <div style={{ flexShrink: 0 }}>
                            {c.company ? (
                              <>
                                <img
                                  src={getCompanyLogo(c.company, c.url)}
                                  alt={`${c.company} logo`}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: theme.radii.small,
                                    objectFit: "contain",
                                    border: `1px solid ${theme.colors.inputBorder}`,
                                    background: theme.colors.cardBg,
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display = "flex";
                                  }}
                                />
                                <div
                                  style={{
                                    display: "none",
                                    width: 32,
                                    height: 32,
                                    borderRadius: theme.radii.small,
                                    background: getCompanyColor(c.company),
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontSize: 14,
                                    fontWeight: 600,
                                  }}
                                >
                                  {getCompanyInitial(c.company)}
                                </div>
                              </>
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  width: 32,
                                  height: 32,
                                  borderRadius: theme.radii.small,
                                  background: theme.colors.subtle,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: theme.colors.muted,
                                }}
                              >
                                <Globe size={18} />
                              </div>
                            )}

                          {/* Column-level import UI removed (import now in Add modal) */}
                          </div>
                          
                            {/* Company Name and Job Title Stack */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                ...cardFont,
                                fontSize: 11,
                                fontWeight: 700,
                                color: theme.colors.muted,
                                lineHeight: 1.3,
                                marginBottom: 2,
                              }}>
                                {c.company || "Company"}
                              </div>
                              <div style={{
                                ...cardFont,
                                fontSize: 13,
                                fontWeight: 500,
                                color: theme.colors.text,
                                lineHeight: 1.3,
                              }}>
                                {c.title}
                              </div>
                              {c.location ? (
                                <div style={{ ...cardFont, fontSize: 11, color: theme.colors.muted, marginTop: 2 }}>
                                  {c.location}
                                </div>
                              ) : null}
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                  </div>

                  {/* Divider between sections */}
                  <hr style={{ marginTop: 16, marginBottom: 16, marginLeft: 12, marginRight: 12, border: "none", borderTop: "1px solid #e5e2db" }} />

                  {/* Others Label */}
                  <div style={{ fontSize: 10, color: theme.colors.muted, letterSpacing: "0.5px", textTransform: "uppercase", fontFamily: theme.fonts.ui, marginBottom: 8, marginLeft: 4 }}>
                    OTHERS
                  </div>

                  {/* Low Priority Section */}
                  <div
                    style={getSectionDropStyle("others")}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragging !== null) {
                        const draggedCard = cards.find((card) => card.id === dragging);
                        if (draggedCard && draggedCard.col === "saved" && draggedCard.isHighPriority === true) {
                          const po = Date.now();
                          setCards((p) =>
                            p.map((card) =>
                              card.id === dragging
                                ? { ...card, isHighPriority: false, priorityOrder: po }
                                : card
                            )
                          );
                          onCardUpdate?.(dragging, { isHighPriority: false, priorityOrder: po });
                        }
                      }
                      setDragging(null);
                      setDragOver(null);
                      setIsDragging(false);
                    }}
                  >
                  {lowCards.map((c) => {
                    return (
                      <div
                            key={c.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, c.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOver(c.id);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (dragging !== null) {
                                const draggedCard = cards.find((card) => card.id === dragging);
                                if (draggedCard && draggedCard.col !== "saved") {
                                  move(dragging, "saved");
                                } else if (draggedCard && draggedCard.col === "saved" && dragging !== c.id) {
                                  if (draggedCard.isHighPriority !== true) {
                                    const draggedOrder = draggedCard.priorityOrder;
                                    const targetOrder = c.priorityOrder;
                                    setCards((p) =>
                                      p.map((card) => {
                                        if (card.id === dragging) {
                                          return { ...card, priorityOrder: targetOrder };
                                        }
                                        if (card.id === c.id) {
                                          return { ...card, priorityOrder: draggedOrder };
                                        }
                                        return card;
                                      })
                                    );
                                    onCardUpdate?.(dragging, { priorityOrder: targetOrder });
                                    onCardUpdate?.(c.id, { priorityOrder: draggedOrder });
                                  } else {
                                    const po = Date.now();
                                    setCards((p) =>
                                      p.map((card) =>
                                        card.id === dragging
                                          ? { ...card, isHighPriority: false, priorityOrder: po }
                                          : card
                                      )
                                    );
                                    onCardUpdate?.(dragging, { isHighPriority: false, priorityOrder: po });
                                  }
                                }
                              }
                              setDragging(null);
                              setDragOver(null);
                              setIsDragging(false);
                            }}
                            onClick={() => handleCardClick(c)}
                            onMouseEnter={() => setHoveredCardId(c.id)}
                            onMouseLeave={() => setHoveredCardId(null)}
                            style={{
                              ...themeCardStyle(),
                              borderRadius: 12,
                              padding: "10px 14px",
                              marginBottom: 8,
                              borderLeft: "3.5px solid #d5d0c8",
                              boxShadow: hoveredCardId === c.id ? "0 4px 12px rgba(0,0,0,0.1)" : "0 1px 3px rgba(0,0,0,0.04)",
                              cursor: "pointer",
                              userSelect: "none",
                              opacity: dragging === c.id ? 0.5 : 1,
                              transform: hoveredCardId === c.id ? "translateY(-2px)" : "translateY(0)",
                              transition: "all 0.2s ease",
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                        {isStaleCard(c) && (
                          <div
                            style={{
                              ...staleBadgeStyle,
                              right: 10,
                            }}
                          >
                            !!
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCards((p) =>
                                p.map((card) =>
                                  card.id === c.id
                                    ? { ...card, isStarred: !card.isStarred }
                                    : card
                                )
                              );
                              onCardUpdate?.(c.id, { isStarred: !c.isStarred });
                            }}
                            style={{
                              ...savedStarButtonStyle,
                              color: c.isStarred ? "#d4a537" : "#c5c0b8",
                            }}
                            aria-label={c.isStarred ? "Unstar job" : "Star job"}
                          >
                            {c.isStarred ? "★" : "☆"}
                          </button>
                          {/* Company Icon */}
                          <div style={{ flexShrink: 0 }}>
                            {c.company ? (
                              <>
                                <img
                                  src={getCompanyLogo(c.company, c.url)}
                                  alt={`${c.company} logo`}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: theme.radii.small,
                                    objectFit: "contain",
                                    border: `1px solid ${theme.colors.inputBorder}`,
                                    background: theme.colors.cardBg,
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display = "flex";
                                  }}
                                />
                                <div
                                  style={{
                                    display: "none",
                                    width: 32,
                                    height: 32,
                                    borderRadius: theme.radii.small,
                                    background: getCompanyColor(c.company),
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontSize: 14,
                                    fontWeight: 600,
                                  }}
                                >
                                  {getCompanyInitial(c.company)}
                                </div>
                              </>
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  width: 32,
                                  height: 32,
                                  borderRadius: theme.radii.small,
                                  background: theme.colors.subtle,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: theme.colors.muted,
                                }}
                              >
                                <Globe size={18} />
                              </div>
                            )}
                          </div>
                          
                            {/* Company Name and Job Title Stack */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                ...cardFont,
                                fontSize: 11,
                                fontWeight: 700,
                                color: theme.colors.muted,
                                lineHeight: 1.3,
                                marginBottom: 2,
                              }}>
                                {c.company || "Company"}
                              </div>
                              <div style={{
                                ...cardFont,
                                fontSize: 13,
                                fontWeight: 500,
                                color: theme.colors.text,
                                lineHeight: 1.3,
                              }}>
                                {c.title}
                              </div>
                              {c.location ? (
                                <div style={{ ...cardFont, fontSize: 11, color: theme.colors.muted, marginTop: 2 }}>
                                  {c.location}
                                </div>
                              ) : null}
                            </div>
                          </div>

                        </div>

                        {/* Bottom Section: Date + External Link */}
                        {/* Minimal card face: only company + title (+ optional location) */}
                      </div>
                    );
                  })}
                  </div>
                </>
              ) : (
                /* Regular rendering for non-saved columns */
                colCards.map((c) => {
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, c.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleCardClick(c)}
                    onMouseEnter={() => setHoveredCardId(c.id)}
                    onMouseLeave={() => setHoveredCardId(null)}
                    style={{
                      ...themeCardStyle(),
                      borderRadius: 12,
                      padding: "10px 14px",
                      marginBottom: 8,
                      borderLeft: `4px solid ${col.color}`,
                      boxShadow: hoveredCardId === c.id ? "0 4px 12px rgba(0,0,0,0.1)" : "0 1px 3px rgba(0,0,0,0.04)",
                      cursor: "pointer",
                      userSelect: "none",
                      opacity: dragging === c.id ? 0.5 : 1,
                      transform: hoveredCardId === c.id ? "translateY(-2px)" : "translateY(0)",
                      transition: "all 0.2s ease",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Render stale badge if card is stale */}
                    {isStaleCard(c) && (
                      <div
                        style={{
                          ...staleBadgeStyle,
                          right: 8,
                        }}
                      >
                        !!
                      </div>
                    )}
                    {/* Top Section: Icon + Company Name + Job Title */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
                      {/* Company Icon */}
                      <div style={{ flexShrink: 0 }}>
                        {c.company ? (
                          <>
                            <img
                              src={getCompanyLogo(c.company, c.url)}
                              alt={`${c.company} logo`}
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: theme.radii.small,
                                objectFit: "contain",
                                border: `1px solid ${theme.colors.inputBorder}`,
                                background: theme.colors.cardBg,
                              }}
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextSibling.style.display = "flex";
                              }}
                            />
                            <div
                              style={{
                                display: "none",
                                width: 32,
                                height: 32,
                                borderRadius: theme.radii.small,
                                background: getCompanyColor(c.company),
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: 14,
                                fontWeight: 600,
                              }}
                            >
                              {getCompanyInitial(c.company)}
                            </div>
                          </>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              width: 32,
                              height: 32,
                              borderRadius: theme.radii.small,
                              background: theme.colors.subtle,
                              alignItems: "center",
                              justifyContent: "center",
                              color: theme.colors.muted,
                            }}
                          >
                            <Globe size={18} />
                          </div>
                        )}
                      </div>
                      
                      {/* Company Name and Job Title Stack */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          ...cardFont,
                          fontSize: 11,
                          fontWeight: 700,
                          color: theme.colors.muted,
                          lineHeight: 1.3,
                          marginBottom: 2,
                        }}>
                          {c.company || "Company"}
                        </div>
                        <div style={{
                          ...cardFont,
                          fontSize: 13,
                          fontWeight: 500,
                          color: theme.colors.text,
                          lineHeight: 1.3,
                        }}>
                          {c.title}
                        </div>
                        {c.location ? (
                          <div style={{ ...cardFont, fontSize: 11, color: theme.colors.muted, marginTop: 2 }}>
                            {c.location}
                          </div>
                        ) : null}
                      </div>
                      </div>

                      {/* Delete Button - Top Right */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Remove this job?")) {
                            remove(c.id);
                          }
                        }}
                        style={{
                          background: "none",
                          position: "absolute",
                          bottom: 4,
                          right: 6,
                          border: "none",
                          cursor: "pointer",
                          color: theme.colors.muted,
                          flexShrink: 0,
                          padding: 2,
                          opacity: hoveredCardId === c.id ? 1 : 0,
                          transition: "opacity 0.15s",
                        }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Minimal card face: only company + title (+ optional location) */}
                  </div>
                );
              }))}
            </div>
          );
        })}
      </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <KanbanModal
          modalCol={modalCol}
          modalMode={modalMode}
          formData={formData}
          setFormData={setFormData}
          validation={validation}
          isImportPanelOpen={isImportPanelOpen}
          setIsImportPanelOpen={setIsImportPanelOpen}
          saveImportedCard={saveImportedCard}
          saveJob={saveJob}
          updateNotes={updateNotes}
          editingId={editingId}
          cards={cards}
          setCards={setCards}
          onCardUpdate={onCardUpdate}
          remove={remove}
          switchToEditMode={switchToEditMode}
          switchToViewMode={switchToViewMode}
          setModalOpen={setModalOpen}
          setEditingId={setEditingId}
          setModalCol={setModalCol}
          kanbanCols={KANBAN_COLS}
        />
      )}
    </div>
  );
}