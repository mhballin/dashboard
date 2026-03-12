import { useState } from "react";
import { Plus, ExternalLink, Trash2, Globe } from "lucide-react";
import { KANBAN_COLS } from "../data/kanbanCols";
import { todayStr } from "../utils/dates";

const lbl = {
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9ca3af",
};

const cardFont = {
  fontFamily: "'Plus Jakarta Sans',sans-serif",
};

// Metadata extraction function
const extractMetadata = (descriptionHTML) => {
  if (!descriptionHTML) return { salary: null, location: null, jobType: null };
  
  // Strip HTML tags
  const plainText = descriptionHTML.replace(/<[^>]*>/g, ' ');
  
  // Extract SALARY
  const salaryRegex = /\$[\d,]+[kK]?\s*[-–—to]+\s*\$[\d,]+[kK]?(?:\/(?:hr|hour|year|yr|annum))?|\$[\d,]+[kK]?(?:\/(?:hr|hour|year|yr))?/i;
  const salaryMatch = plainText.match(salaryRegex);
  
  // Extract LOCATION
  const locationRegex = /\b(Remote|Hybrid|On[-\s]?site|[A-Z][a-z]+,\s*[A-Z]{2})\b/;
  const locationMatch = plainText.match(locationRegex);
  
  // Extract JOB TYPE
  const jobTypeRegex = /\b(Full[-\s]?time|Part[-\s]?time|Contract|Freelance|Hourly|Temporary|Permanent)\b/i;
  const jobTypeMatch = plainText.match(jobTypeRegex);
  
  return {
    salary: salaryMatch ? salaryMatch[0] : null,
    location: locationMatch ? locationMatch[0] : null,
    jobType: jobTypeMatch ? jobTypeMatch[0] : null,
  };
};

// Date formatting function
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-US", 
    { month: "short", day: "numeric", year: "numeric" });
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
  fontFamily: "'Plus Jakarta Sans', sans-serif",
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
  color: "#c5c0b8",
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
    if (!companyName) return '#9ca3af';
    
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
                background: isOver ? col.bg : "#fafaf8",
                borderRadius: 18,
                padding: 16,
                minHeight: 240,
                border: `1.5px solid ${isOver ? col.color + "50" : "#ede9e3"}`,
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
                  <span style={{ ...cardFont, fontSize: 13, fontWeight: 700, color: "#374151" }}>
                    {col.label}
                  </span>
                  <span style={{ ...cardFont, fontSize: 11, color: "#9ca3af" }}>
                    ({colCards.length})
                  </span>
                </div>
                <button
                  onClick={() => openModal(col.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: 2 }}
                >
                  <Plus size={15} />
                </button>
              </div>

              {/* Job Cards - Different rendering for saved column */}
              {col.id === "saved" ? (
                <>
                  {/* Priority Label */}
                  <div style={{ fontSize: 10, color: "#a09a8f", letterSpacing: "0.5px", textTransform: "uppercase", fontFamily: "Plus Jakarta Sans", marginBottom: 8, marginLeft: 4 }}>
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
                    const colDateKey = "saved";
                    const colDate = c.dates ? c.dates[colDateKey] : null;
                    const displayDate = colDate || c.added;

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
                          background: "#ffffff",
                          borderRadius: 12,
                          padding: "10px 14px",
                          marginBottom: 8,
                          border: "1px solid #ede9e3",
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
                                    borderRadius: 4,
                                    objectFit: "contain",
                                    border: "1px solid #e5e7eb",
                                    background: "white",
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
                                    borderRadius: 6,
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
                                  borderRadius: 6,
                                  background: "#f3f4f6",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#9ca3af",
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
                                color: "#6b7280",
                                lineHeight: 1.3,
                                marginBottom: 2,
                              }}>
                                {c.company || "Company"}
                              </div>
                              <div style={{
                                ...cardFont,
                                fontSize: 13,
                                fontWeight: 500,
                                color: "#374151",
                                lineHeight: 1.3,
                              }}>
                                {c.title}
                              </div>
                              {c.location ? (
                                <div style={{ ...cardFont, fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
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
                  <div style={{ fontSize: 10, color: "#a09a8f", letterSpacing: "0.5px", textTransform: "uppercase", fontFamily: "Plus Jakarta Sans", marginBottom: 8, marginLeft: 4 }}>
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
                    const colDateKey = "saved";
                    const colDate = c.dates ? c.dates[colDateKey] : null;
                    const displayDate = colDate || c.added;

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
                          background: "#ffffff",
                          borderRadius: 12,
                          padding: "10px 14px",
                          marginBottom: 8,
                          border: "1px solid #ede9e3",
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
                                    borderRadius: 4,
                                    objectFit: "contain",
                                    border: "1px solid #e5e7eb",
                                    background: "white",
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
                                    borderRadius: 6,
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
                                  borderRadius: 6,
                                  background: "#f3f4f6",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#9ca3af",
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
                                color: "#6b7280",
                                lineHeight: 1.3,
                                marginBottom: 2,
                              }}>
                                {c.company || "Company"}
                              </div>
                              <div style={{
                                ...cardFont,
                                fontSize: 13,
                                fontWeight: 500,
                                color: "#374151",
                                lineHeight: 1.3,
                              }}>
                                {c.title}
                              </div>
                              {c.location ? (
                                <div style={{ ...cardFont, fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
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
                colCards.map((c, idx) => {
                // Get the date for the current column
                const colDateKey = col.id === "saved" ? "saved" : col.id;
                const colDate = c.dates ? c.dates[colDateKey] : null;
                const displayDate = colDate || c.added;

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
                      background: "#ffffff",
                      borderRadius: 12,
                      padding: "10px 14px",
                      marginBottom: 8,
                      border: "1px solid #ede9e3",
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
                                borderRadius: 6,
                                objectFit: "contain",
                                border: "1px solid #e5e7eb",
                                background: "white",
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
                                borderRadius: 6,
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
                              borderRadius: 6,
                              background: "#f3f4f6",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#9ca3af",
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
                          color: "#6b7280",
                          lineHeight: 1.3,
                          marginBottom: 2,
                        }}>
                          {c.company || "Company"}
                        </div>
                        <div style={{
                          ...cardFont,
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#374151",
                          lineHeight: 1.3,
                        }}>
                          {c.title}
                        </div>
                        {c.location ? (
                          <div style={{ ...cardFont, fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
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
                          color: "#9ca3af",
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

      {/* Modal - Three Modes: Create, View, Edit */}
      {modalOpen && (() => {
        const currentCol = KANBAN_COLS.find(col => col.id === modalCol);
        const isViewMode = modalMode === 'view';
        const isEditMode = modalMode === 'edit';
        const isCreateMode = modalMode === 'create';
        
        return (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setModalOpen(false)}
          >
            {/* Modal Card */}
            <div
              style={{
                background: "white",
                borderRadius: 20,
                padding: isViewMode ? 32 : 24,
                boxShadow: "0 20px 25px rgba(0,0,0,0.15)",
                border: "1px solid #ede9e3",
                maxWidth: isViewMode ? 1200 : 450,
                width: "90%",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* VIEW MODE - Two-Column Layout */}
              {isViewMode && (() => {
                const metadata = extractMetadata(formData.description);
                const hasMetadata = metadata.salary || metadata.location || metadata.jobType;
                
                // Get current card for dates
                const currentCard = cards.find(c => c.id === editingId);
                const dates = currentCard?.dates || {};
                const currentCol = currentCard?.col;
                
                // Define all stages in order
                const allStages = [
                  { key: 'saved', label: 'added' },
                  { key: 'applied', label: 'applied' },
                  { key: 'interviewing', label: 'interviewing' },
                  { key: 'closed', label: 'closed' },
                ];
                
                // Find which stage the card is currently in
                const currentStageIndex = allStages.findIndex(stage => stage.key === currentCol);
                
                // Only include stages up to and including the current stage
                const relevantStages = currentStageIndex >= 0 
                  ? allStages.slice(0, currentStageIndex + 1)
                  : allStages;
                
                // Build timeline entries from relevant stages that have dates
                const timelineEntries = relevantStages
                  .filter(stage => dates[stage.key])
                  .map((stage, index, arr) => ({
                    ...stage,
                    date: dates[stage.key],
                    isLast: index === arr.length - 1,
                  }));
                const hasTimeline = timelineEntries.length > 0;
                
                return (
                  <>
                    {/* Header with Logo */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: `3px solid ${currentCol?.color || '#e5e7eb'}` }}>
                      <div style={{ flexShrink: 0 }}>
                        {formData.company ? (
                          <>
                            <img
                              src={getCompanyLogo(formData.company, formData.url)}
                              alt={`${formData.company} logo`}
                              style={{
                                width: 64,
                                height: 64,
                                borderRadius: 12,
                                objectFit: "contain",
                                border: "1px solid #e5e7eb",
                                background: "white",
                              }}
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextSibling.style.display = "flex";
                              }}
                            />
                            <div
                              style={{
                                display: "none",
                                width: 64,
                                height: 64,
                                borderRadius: 12,
                                background: getCompanyColor(formData.company),
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: 24,
                                fontWeight: 600,
                              }}
                            >
                              {getCompanyInitial(formData.company)}
                            </div>
                          </>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              width: 64,
                              height: 64,
                              borderRadius: 12,
                              background: "#f3f4f6",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#9ca3af",
                            }}
                          >
                            <Globe size={32} />
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h2 style={{
                          ...cardFont,
                          fontSize: 24,
                          fontWeight: 700,
                          marginBottom: 4,
                          color: "#1a1a1a",
                        }}>
                          {formData.company || "Company"}
                        </h2>
                        <div style={{
                          ...cardFont,
                          fontSize: 16,
                          fontWeight: 500,
                          color: "#6b7280",
                        }}>
                          {formData.title || "Job Title"}
                        </div>
                        {formData.url && (
                          <a
                            href={formData.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 8,
                              color: currentCol?.color || "#3b82f6",
                              ...cardFont,
                              fontSize: 13,
                              fontWeight: 600,
                              textDecoration: "none",
                            }}
                          >
                            <ExternalLink size={14} />
                            View Job Posting
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Two-Column Layout */}
                    <div style={{ display: "flex", flexDirection: "row", gap: 24, alignItems: "flex-start" }}>
                      
                      {/* Left Column - Job Description */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.5px",
                          textTransform: "uppercase",
                          color: "#9ca3af",
                          fontFamily: "Plus Jakarta Sans",
                          marginBottom: 8,
                        }}>
                          JOB DESCRIPTION
                        </div>
                        {formData.description ? (
                          <div style={{
                            fontSize: 14,
                            color: "#374151",
                            lineHeight: 1.7,
                            fontFamily: "Plus Jakarta Sans",
                          }}
                           dangerouslySetInnerHTML={{ __html: formData.description }}
                          />
                        ) : (
                          <div style={{
                            fontSize: 14,
                            color: "#9ca3af",
                            fontStyle: "italic",
                            fontFamily: "Plus Jakarta Sans",
                          }}>
                            No description provided
                          </div>
                        )}
                      </div>

                      {/* Right Column - Metadata + Notes */}
                      <div style={{ width: "42%", flexShrink: 0 }}>
                        
                        {/* Metadata Bar */}
                        {hasMetadata && (
                          <div style={{
                            padding: 12,
                            background: "#f7f5f0",
                            borderRadius: 8,
                            marginBottom: 20,
                          }}>
                            {metadata.location && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 16 }}>📍</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "Plus Jakarta Sans" }}>
                                    Location
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: "#374151", fontFamily: "Plus Jakarta Sans" }}>
                                    {metadata.location}
                                  </div>
                                </div>
                              </div>
                            )}
                            {metadata.salary && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 16 }}>💰</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "Plus Jakarta Sans" }}>
                                    Salary
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: "#374151", fontFamily: "Plus Jakarta Sans" }}>
                                    {metadata.salary}
                                  </div>
                                </div>
                              </div>
                            )}
                            {metadata.jobType && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                                <span style={{ fontSize: 16 }}>💼</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "Plus Jakarta Sans" }}>
                                    Job Type
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: "#374151", fontFamily: "Plus Jakarta Sans" }}>
                                    {metadata.jobType}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Timeline Section */}
                        {hasTimeline && (
                          <>
                            <div style={{
                              fontSize: 11,
                              fontWeight: 600,
                              letterSpacing: "0.5px",
                              textTransform: "uppercase",
                              color: "#9ca3af",
                              fontFamily: "Plus Jakarta Sans",
                              marginBottom: 8,
                            }}>
                              TIMELINE
                            </div>
                            <div style={{
                              padding: 12,
                              background: "#f7f5f0",
                              borderRadius: 8,
                              marginBottom: 20,
                            }}>
                              {timelineEntries.map((entry) => (
                                <div 
                                  key={entry.key}
                                  style={{ 
                                    display: "flex", 
                                    justifyContent: "space-between", 
                                    alignItems: "center",
                                    marginBottom: entry.isLast ? 0 : 8,
                                  }}
                                >
                                  <div style={{ 
                                    fontSize: 12, 
                                    color: "#6b7280", 
                                    fontFamily: "Plus Jakarta Sans" 
                                  }}>
                                    {entry.label}
                                  </div>
                                  <input
                                    type="date"
                                    value={entry.date}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const currentCard = cards.find(c => c.id === editingId);
                                      const updatedDates = { ...(currentCard?.dates || {}), [entry.key]: val };
                                      setCards((p) =>
                                        p.map((c) =>
                                          c.id === editingId
                                            ? { ...c, dates: updatedDates }
                                            : c
                                        )
                                      );
                                      onCardUpdate?.(editingId, { dates: updatedDates });
                                    }}
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      fontSize: 13,
                                      fontWeight: 500,
                                      color: "#374151",
                                      fontFamily: "Plus Jakarta Sans",
                                      cursor: "pointer",
                                      outline: "none",
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Notes Section */}
                        <div>
                          <div style={{
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.5px",
                            textTransform: "uppercase",
                            color: "#9ca3af",
                            fontFamily: "Plus Jakarta Sans",
                            marginBottom: 8,
                          }}>
                            YOUR NOTES
                          </div>
                          <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Add your thoughts or interview prep notes..."
                            rows={10}
                            style={{
                              width: "100%",
                              border: "2px solid #e5e7eb",
                              borderRadius: 12,
                              padding: 12,
                              ...cardFont,
                              fontSize: 14,
                              boxSizing: "border-box",
                              outline: "none",
                              resize: "vertical",
                              lineHeight: 1.5,
                              whiteSpace: "pre-wrap",
                              marginBottom: 12,
                            }}
                          />
                          <button
                            onClick={updateNotes}
                            style={{
                              width: "100%",
                              background: currentCol?.color || "#3b82f6",
                              border: "none",
                              borderRadius: 6,
                              padding: "8px 12px",
                              color: "white",
                              ...cardFont,
                              fontWeight: 600,
                              fontSize: 13,
                              cursor: "pointer",
                            }}
                          >
                            Update Notes
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sticky Action Bar */}
                    <div style={{ 
                      position: "sticky",
                      bottom: 0,
                      background: "#ffffff",
                      paddingTop: 16,
                      marginTop: 24,
                      borderTop: "1px solid #ede9e3",
                      display: "flex", 
                      gap: 12,
                    }}>
                      <button
                        onClick={switchToEditMode}
                        style={{
                          flex: 1,
                          background: currentCol?.color || "#3b82f6",
                          border: "none",
                          borderRadius: 8,
                          padding: "10px 16px",
                          color: "white",
                          ...cardFont,
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: "pointer",
                        }}
                      >
                        Edit Job Details
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm("Delete this job?")) {
                            remove(editingId);
                            setModalOpen(false);
                            setEditingId(null);
                          }
                        }}
                        style={{
                          background: "#fee2e2",
                          border: "1px solid #fecaca",
                          borderRadius: 8,
                          padding: "10px 16px",
                          color: "#dc2626",
                          ...cardFont,
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setModalOpen(false)}
                        style={{
                          background: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          padding: "10px 16px",
                          color: "#6b7280",
                          ...cardFont,
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: "pointer",
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </>
                );
              })()}

              {/* CREATE MODE or EDIT MODE - Form Layout */}
              {(isCreateMode || isEditMode) && (
                <>
            <h2 style={{
              ...cardFont,
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 16,
              color: "#1a1a1a",
            }}>
              {isEditMode ? "Edit Job Details" : "Add Job"}
            </h2>

            {/* Company */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                ...cardFont,
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 4,
              }}>
                Company *
              </label>
              <input
                value={formData.company}
                onChange={(e) => {
                  setFormData({ ...formData, company: e.target.value });
                  if (validation.company) {
                    setValidation((prev) => ({ ...prev, company: "" }));
                  }
                }}
                placeholder="e.g., Acme Corp"
                style={{
                  width: "100%",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  padding: "8px 12px",
                  ...cardFont,
                  fontSize: 13,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              {validation.company && (
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 12,
                    color: "#dc2626",
                    fontFamily: "Plus Jakarta Sans",
                  }}
                >
                  {validation.company}
                </p>
              )}
            </div>

            {/* Job Title */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                ...cardFont,
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 4,
              }}>
                Job Title *
              </label>
              <input
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (validation.title) {
                    setValidation((prev) => ({ ...prev, title: "" }));
                  }
                }}
                placeholder="e.g., Senior Frontend Engineer"
                style={{
                  width: "100%",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  padding: "8px 12px",
                  ...cardFont,
                  fontSize: 13,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              {validation.title && (
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 12,
                    color: "#dc2626",
                    fontFamily: "Plus Jakarta Sans",
                  }}
                >
                  {validation.title}
                </p>
              )}
            </div>

            {/* Location (optional) */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                ...cardFont,
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 4,
              }}>
                Location (optional)
              </label>
              <input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Portland, ME or Remote"
                style={{
                  width: "100%",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  padding: "8px 12px",
                  ...cardFont,
                  fontSize: 13,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            {/* Job Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                ...cardFont,
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 4,
              }}>
                Job Description
              </label>
              <div
                contentEditable
                onInput={(e) => setFormData({ ...formData, description: e.currentTarget.innerHTML })}
                dangerouslySetInnerHTML={{ __html: formData.description }}
                style={{
                  width: "100%",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  padding: "8px 12px",
                  ...cardFont,
                  fontSize: 13,
                  boxSizing: "border-box",
                  outline: "none",
                  minHeight: 150,
                  maxHeight: 300,
                  overflowY: "auto",
                  lineHeight: 1.5,
                  background: "white",
                }}
                data-placeholder="Paste job description here (formatting will be preserved)..."
              />
              <style>{`
                [contentEditable][data-placeholder]:empty:before {
                  content: attr(data-placeholder);
                  color: #9ca3af;
                  pointer-events: none;
                }
              `}</style>
            </div>

            {/* Direct Link */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                ...cardFont,
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 4,
              }}>
                Job Posting URL
              </label>
              <input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://linkedin.com/jobs/..."
                style={{
                  width: "100%",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  padding: "8px 12px",
                  ...cardFont,
                  fontSize: 13,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                ...cardFont,
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 4,
              }}>
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Quick thoughts or reminders..."
                rows={2}
                style={{
                  width: "100%",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  padding: "8px 12px",
                  ...cardFont,
                  fontSize: 13,
                  boxSizing: "border-box",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Column Selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                ...cardFont,
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 8,
              }}>
                Column
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {KANBAN_COLS.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => setModalCol(col.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 20,
                      border: `2px solid ${modalCol === col.id ? col.color : "#e5e7eb"}`,
                      background: modalCol === col.id ? col.bg : "white",
                      color: modalCol === col.id ? col.color : "#6b7280",
                      ...cardFont,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              {isEditMode && (
                <button
                  onClick={switchToViewMode}
                  style={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: "8px 16px",
                    color: "#6b7280",
                    ...cardFont,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ← Back to View
                </button>
              )}
              <button
                onClick={saveJob}
                style={{
                  flex: 1,
                  background: currentCol?.color || "#16a34a",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  color: "white",
                  ...cardFont,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {isEditMode ? "Save Changes" : "Save Job"}
              </button>
              {!isEditMode && (
                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    flex: 1,
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: "8px 16px",
                    color: "#6b7280",
                    ...cardFont,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Discard
                </button>
              )}
            </div>
            </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}