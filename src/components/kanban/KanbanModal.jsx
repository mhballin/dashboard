import React from "react";
import { ExternalLink, Globe, Trash2 } from "lucide-react";
import { DatePicker } from "../DatePicker";
import { ImportFromUrlPanel } from "../ImportFromUrlPanel";
import { AutoResizeQuickNote } from "../AutoResizeQuickNote";
import { theme } from "../../styles/theme";
import { todayStr } from "../../utils/dates";

const cardFont = {
  fontFamily: theme.fonts.ui,
};

const extractMetadata = (descriptionHTML) => {
  if (!descriptionHTML) return { salary: null, location: null, jobType: null };
  const plainText = descriptionHTML.replace(/<[^>]*>/g, " ");
  const salaryRegex = /\$[\d,]+[kK]?\s*[-–—to]+\s*\$[\d,]+[kK]?(?:\/(?:hr|hour|year|yr|annum))?|\$[\d,]+[kK]?(?:\/(?:hr|hour|year|yr))?/i;
  const salaryMatch = plainText.match(salaryRegex);
  const locationRegex = /\b(Remote|Hybrid|On[-\s]?site|[A-Z][a-z]+,\s*[A-Z]{2})\b/;
  const locationMatch = plainText.match(locationRegex);
  const jobTypeRegex = /\b(Full[-\s]?time|Part[-\s]?time|Contract|Freelance|Hourly|Temporary|Permanent)\b/i;
  const jobTypeMatch = plainText.match(jobTypeRegex);
  return {
    salary: salaryMatch ? salaryMatch[0] : null,
    location: locationMatch ? locationMatch[0] : null,
    jobType: jobTypeMatch ? jobTypeMatch[0] : null,
  };
};

export default function KanbanModal({
  modalCol,
  modalMode,
  formData,
  setFormData,
  validation,
  isImportPanelOpen,
  setIsImportPanelOpen,
  saveImportedCard,
  saveJob,
  updateNotes,
  editingId,
  cards,
  setCards,
  onCardUpdate,
  remove,
  switchToEditMode,
  switchToViewMode,
  setModalOpen,
  setEditingId,
  setModalCol,
  kanbanCols = [],
  onSetFollowUp,
  onSnoozeReminder,
  onCompleteFollowUp,
}) {
  const isViewMode = modalMode === "view";
  const isEditMode = modalMode === "edit";
  const isCreateMode = modalMode === "create";

  const currentCol = kanbanCols.find((c) => c.id === modalCol) || {};
  const [timelineQuickNote, setTimelineQuickNote] = React.useState("");

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
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: isViewMode ? 32 : 24,
          boxShadow: "0 20px 25px rgba(0,0,0,0.15)",
          border: `1px solid ${theme.colors.border}`,
          maxWidth: isViewMode ? 1200 : 450,
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isViewMode && (() => {
          const metadata = extractMetadata(formData.description);
          const hasMetadata = metadata.salary || metadata.location || metadata.jobType;
          const currentCard = cards.find((c) => c.id === editingId);
          const dates = currentCard?.dates || {};
          const currentColKey = currentCard?.col;
          const allStages = [
            { key: "saved", label: "added" },
            { key: "applied", label: "applied" },
            { key: "interviewing", label: "interviewing" },
            { key: "closed", label: "closed" },
          ];
          const currentStageIndex = allStages.findIndex((stage) => stage.key === currentColKey);
          const relevantStages = currentStageIndex >= 0 ? allStages.slice(0, currentStageIndex + 1) : allStages;
          const timelineEntries = relevantStages
            .filter((stage) => dates[stage.key])
            .map((stage, index, arr) => ({
              ...stage,
              date: dates[stage.key],
              isLast: index === arr.length - 1,
            }));
          const hasTimeline = timelineEntries.length > 0;
          const reminderDate = currentCard?.followUpDate || null;
          const deadlineDate = currentCard?.deadline || null;
          const timelineNotes = Array.isArray(currentCard?.interviewNotes) ? currentCard.interviewNotes : [];
          const tomorrowStr = (() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const y = tomorrow.getFullYear();
            const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
            const d = String(tomorrow.getDate()).padStart(2, "0");
            return `${y}-${m}-${d}`;
          })();

          return (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: `3px solid ${currentCol?.color || theme.colors.inputBorder}` }}>
                <div style={{ flexShrink: 0 }}>
                  {formData.company ? (
                    <>
                      <img
                        src={(formData.url && (() => { try { return `https://www.google.com/s2/favicons?sz=128&domain=${new URL(formData.url).hostname}` } catch { return undefined } })()) || undefined}
                        alt={`${formData.company} logo`}
                        style={{ width: 64, height: 64, borderRadius: 12, objectFit: "contain", border: `1px solid ${theme.colors.inputBorder}`, background: "white" }}
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                      <div style={{ display: "none", width: 64, height: 64, borderRadius: 12, alignItems: "center", justifyContent: "center", color: "white", fontSize: 24, fontWeight: 600 }}>{formData.company?.charAt(0)?.toUpperCase()}</div>
                    </>
                  ) : (
                    <div style={{ display: "flex", width: 64, height: 64, borderRadius: 12, background: theme.colors.subtle, alignItems: "center", justifyContent: "center", color: theme.colors.muted }}>
                      <Globe size={32} />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ ...cardFont, fontSize: 24, fontWeight: 700, marginBottom: 4, color: theme.colors.text }}>{formData.company || "Company"}</h2>
                  <div style={{ ...cardFont, fontSize: 16, fontWeight: 500, color: theme.colors.muted }}>{formData.title || "Job Title"}</div>
                  {formData.url && (
                    <a href={formData.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, color: currentCol?.color || "#3b82f6", ...cardFont, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                      <ExternalLink size={14} />
                      View Job Posting
                    </a>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "row", gap: 24, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: theme.colors.muted, fontFamily: theme.fonts.ui, marginBottom: 8 }}>JOB DESCRIPTION</div>
                  {formData.description ? (
                    <div style={{ fontSize: 14, color: theme.colors.text, lineHeight: 1.7, fontFamily: theme.fonts.ui }} dangerouslySetInnerHTML={{ __html: formData.description }} />
                  ) : (
                    <div style={{ fontSize: 14, color: theme.colors.muted, fontStyle: "italic", fontFamily: theme.fonts.ui }}>No description provided</div>
                  )}
                </div>

                <div style={{ width: "42%", flexShrink: 0 }}>
                  {hasMetadata && (
                    <div style={{ padding: 12, background: theme.colors.bg, borderRadius: theme.radii.default, marginBottom: 20 }}>
                      {metadata.location && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 16 }}>📍</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: theme.colors.muted, fontFamily: theme.fonts.ui }}>Location</div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: theme.colors.text, fontFamily: theme.fonts.ui }}>{metadata.location}</div>
                          </div>
                        </div>
                      )}
                      {metadata.salary && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 16 }}>💰</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: theme.colors.muted, fontFamily: theme.fonts.ui }}>Salary</div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: theme.colors.text, fontFamily: theme.fonts.ui }}>{metadata.salary}</div>
                          </div>
                        </div>
                      )}
                      {metadata.jobType && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                          <span style={{ fontSize: 16 }}>💼</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: theme.colors.muted, fontFamily: theme.fonts.ui }}>Job Type</div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: theme.colors.text, fontFamily: theme.fonts.ui }}>{metadata.jobType}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {hasTimeline && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: theme.colors.muted, fontFamily: theme.fonts.ui, marginBottom: 8 }}>TIMELINE</div>
                      <div style={{ padding: 12, background: theme.colors.bg, borderRadius: theme.radii.default, marginBottom: 20 }}>
                        {timelineEntries.map((entry) => (
                          <div key={entry.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: entry.isLast ? 0 : 8 }}>
                            <div style={{ fontSize: 12, color: theme.colors.muted, fontFamily: theme.fonts.ui }}>{entry.label}</div>
                            <DatePicker value={entry.date} onChange={(val) => { const updatedDates = { ...(cards.find((c) => c.id === editingId)?.dates || {}), [entry.key]: val }; setCards((p) => p.map((c) => c.id === editingId ? { ...c, dates: updatedDates } : c)); onCardUpdate?.(editingId, { dates: updatedDates }); }} />
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: theme.colors.muted, fontFamily: theme.fonts.ui, marginBottom: 8 }}>REMINDERS</div>
                    <div style={{ padding: 12, background: theme.colors.bg, borderRadius: theme.radii.default }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: theme.colors.muted, fontFamily: theme.fonts.ui }}>Follow-up date</div>
                        <DatePicker value={reminderDate} onChange={(val) => onSetFollowUp?.(editingId, val)} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: theme.colors.muted, fontFamily: theme.fonts.ui }}>Deadline</div>
                        <DatePicker
                          value={deadlineDate}
                          onChange={(val) => {
                            setCards((prev) => prev.map((c) => (c.id === editingId ? { ...c, deadline: val } : c)));
                            onCardUpdate?.(editingId, { deadline: val });
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() => onSnoozeReminder?.(editingId, tomorrowStr)}
                          style={{ background: "white", border: `1px solid ${theme.colors.inputBorder}`, borderRadius: theme.radii.default, padding: "6px 10px", color: theme.colors.muted, ...cardFont, fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                        >
                          Snooze 1 day
                        </button>
                        <button
                          onClick={() => onSnoozeReminder?.(editingId, null)}
                          style={{ background: "white", border: `1px solid ${theme.colors.inputBorder}`, borderRadius: theme.radii.default, padding: "6px 10px", color: theme.colors.muted, ...cardFont, fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                        >
                          Unsnooze
                        </button>
                        <button
                          onClick={() => onCompleteFollowUp?.(editingId)}
                          style={{ background: "#16a34a", border: "none", borderRadius: theme.radii.default, padding: "6px 10px", color: "white", ...cardFont, fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                        >
                          Mark done
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: theme.colors.muted, fontFamily: theme.fonts.ui, marginBottom: 8 }}>TIMELINE NOTES</div>
                      <div style={{ padding: 12, background: theme.colors.bg, borderRadius: theme.radii.default }}>
                      <AutoResizeQuickNote
                        quickNote={timelineQuickNote}
                        setQuickNote={setTimelineQuickNote}
                        onQuickNoteAdd={(v) => {
                          const trimmed = v ? v.trim() : "";
                          if (!trimmed) return;
                          const entry = { id: Date.now(), date: todayStr(), note: trimmed, type: "manual" };
                          const nextNotes = [entry, ...timelineNotes];
                          setCards((prev) => prev.map((c) => (c.id === editingId ? { ...c, interviewNotes: nextNotes } : c)));
                          onCardUpdate?.(editingId, { interviewNotes: nextNotes });
                          setTimelineQuickNote("");
                        }}
                        saveOnBlur={true}
                        clearAfterSave={true}
                      />
                      {timelineNotes.length === 0 ? (
                        <div style={{ fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.muted }}>No timeline notes yet.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {timelineNotes.slice(0, 8).map((entry, idx) => (
                            <div key={entry.id || idx} style={{ border: `1px solid ${theme.colors.inputBorder}`, borderRadius: theme.radii.small, padding: "8px 10px", background: "white" }}>
                              <div style={{ fontFamily: theme.fonts.ui, fontSize: 11, color: theme.colors.muted, marginBottom: 2 }}>{entry.date || ""}</div>
                              <div style={{ fontFamily: theme.fonts.ui, fontSize: 12, color: theme.colors.text, lineHeight: 1.5 }}>{entry.note || ""}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: theme.colors.muted, fontFamily: theme.fonts.ui, marginBottom: 8 }}>YOUR NOTES</div>
                    <AutoResizeQuickNote
                      quickNote={formData.notes || ""}
                      setQuickNote={(v) => setFormData({ ...formData, notes: v })}
                      onQuickNoteAdd={() => {
                        updateNotes?.();
                      }}
                      saveOnBlur={true}
                      clearAfterSave={false}
                    />
                  </div>
                </div>
              </div>

              <div style={{ position: "sticky", bottom: 0, background: theme.colors.cardBg, paddingTop: 16, marginTop: 24, borderTop: `1px solid ${theme.colors.border}`, display: "flex", gap: 12 }}>
                <button onClick={switchToEditMode} style={{ flex: 1, background: currentCol?.color || "#3b82f6", border: "none", borderRadius: theme.radii.default, padding: "10px 16px", color: "white", ...cardFont, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Edit Job Details</button>
                <button onClick={() => { if (window.confirm("Delete this job?")) { remove(editingId); setModalOpen(false); setEditingId(null); } }} style={{ background: theme.colors.dangerBg, border: `1px solid ${theme.colors.dangerBorder}`, borderRadius: theme.radii.default, padding: "10px 16px", color: theme.colors.dangerText, ...cardFont, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Delete</button>
                <button onClick={() => setModalOpen(false)} style={{ background: theme.colors.cardBg, border: `1px solid ${theme.colors.inputBorder}`, borderRadius: theme.radii.default, padding: "10px 16px", color: theme.colors.muted, ...cardFont, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Close</button>
              </div>
            </>
          );
        })()}

        {(isCreateMode || isEditMode) && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ ...cardFont, fontSize: 18, fontWeight: 700, marginBottom: 0, color: "#1a1a1a" }}>{isEditMode ? "Edit Job Details" : "Add Job"}</h2>
              {isCreateMode && (<button onClick={() => setIsImportPanelOpen(true)} style={{ background: "none", border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.default, padding: "6px 10px", fontSize: 13, color: theme.colors.muted, cursor: "pointer", fontFamily: theme.fonts.ui, fontWeight: 600 }}>Import from URL</button>)}
            </div>

            {isCreateMode && (<ImportFromUrlPanel isOpen={isImportPanelOpen} onClose={() => setIsImportPanelOpen(false)} onSave={saveImportedCard} />)}

            <div style={{ marginBottom: 16 }}>
              <label style={{ ...cardFont, fontSize: 12, fontWeight: 600, color: theme.colors.text, display: "block", marginBottom: 4 }}>Company *</label>
              <input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="e.g., Acme Corp" style={{ width: "100%", border: `1px solid ${theme.colors.inputBorder}`, borderRadius: theme.radii.default, padding: "8px 12px", ...cardFont, fontSize: 13, boxSizing: "border-box", outline: "none" }} />
              {validation.company && <p style={{ margin: "4px 0 0", fontSize: 12, color: theme.colors.dangerText, fontFamily: theme.fonts.ui }}>{validation.company}</p>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ ...cardFont, fontSize: 12, fontWeight: 600, color: theme.colors.text, display: "block", marginBottom: 4 }}>Job Title *</label>
              <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Senior Frontend Engineer" style={{ width: "100%", border: `1px solid ${theme.colors.inputBorder}`, borderRadius: theme.radii.default, padding: "8px 12px", ...cardFont, fontSize: 13, boxSizing: "border-box", outline: "none" }} />
              {validation.title && <p style={{ margin: "4px 0 0", fontSize: 12, color: theme.colors.dangerText, fontFamily: theme.fonts.ui }}>{validation.title}</p>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ ...cardFont, fontSize: 12, fontWeight: 600, color: theme.colors.text, display: "block", marginBottom: 4 }}>Location (optional)</label>
              <input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g., Portland, ME or Remote" style={{ width: "100%", border: `1px solid ${theme.colors.inputBorder}`, borderRadius: theme.radii.default, padding: "8px 12px", ...cardFont, fontSize: 13, boxSizing: "border-box", outline: "none" }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ ...cardFont, fontSize: 12, fontWeight: 600, color: theme.colors.text, display: "block", marginBottom: 4 }}>Job Description</label>
              <div contentEditable onInput={(e) => setFormData({ ...formData, description: e.currentTarget.innerHTML })} dangerouslySetInnerHTML={{ __html: formData.description }} style={{ width: "100%", border: `1px solid ${theme.colors.inputBorder}`, borderRadius: theme.radii.default, padding: "8px 12px", ...cardFont, fontSize: 13, boxSizing: "border-box", outline: "none", minHeight: 150, maxHeight: 300, overflowY: "auto", lineHeight: 1.5, background: theme.colors.cardBg }} data-placeholder="Paste job description here (formatting will be preserved)..." />
              <style>{`[contentEditable][data-placeholder]:empty:before { content: attr(data-placeholder); color: ${theme.colors.muted}; pointer-events: none; }`}</style>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ ...cardFont, fontSize: 12, fontWeight: 600, color: theme.colors.text, display: "block", marginBottom: 4 }}>Job Posting URL</label>
              <input value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder="https://linkedin.com/jobs/..." style={{ width: "100%", border: `1px solid ${theme.colors.inputBorder}`, borderRadius: theme.radii.default, padding: "8px 12px", ...cardFont, fontSize: 13, boxSizing: "border-box", outline: "none" }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ ...cardFont, fontSize: 12, fontWeight: 600, color: theme.colors.text, display: "block", marginBottom: 4 }}>Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Quick thoughts or reminders..." rows={2} style={{ width: "100%", border: `1px solid ${theme.colors.inputBorder}`, borderRadius: theme.radii.default, padding: "8px 12px", ...cardFont, fontSize: 13, boxSizing: "border-box", outline: "none", resize: "vertical" }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ ...cardFont, fontSize: 12, fontWeight: 600, color: theme.colors.text, display: "block", marginBottom: 8 }}>Column</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {kanbanCols.map((col) => (
                  <button key={col.id} onClick={() => setModalCol(col.id)} style={{ padding: "6px 12px", borderRadius: theme.radii.card, border: `2px solid ${modalCol === col.id ? col.color : theme.colors.inputBorder}`, background: modalCol === col.id ? col.bg : theme.colors.cardBg, color: modalCol === col.id ? col.color : theme.colors.muted, ...cardFont, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>{col.label}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {isEditMode && (<button onClick={switchToViewMode} style={{ background: theme.colors.cardBg, border: `1px solid ${theme.colors.inputBorder}`, borderRadius: theme.radii.default, padding: "8px 16px", color: theme.colors.muted, ...cardFont, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>← Back to View</button>)}
              <button onClick={saveJob} style={{ flex: 1, background: currentCol?.color || "#16a34a", border: "none", borderRadius: 8, padding: "8px 16px", color: "white", ...cardFont, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{isEditMode ? "Save Changes" : "Save Job"}</button>
              {!isEditMode && (<button onClick={() => setModalOpen(false)} style={{ flex: 1, background: theme.colors.cardBg, border: `1px solid ${theme.colors.inputBorder}`, borderRadius: theme.radii.default, padding: "8px 16px", color: theme.colors.muted, ...cardFont, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Discard</button>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
