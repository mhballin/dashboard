import { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { theme } from "../styles/theme";

export function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const calRef = useRef(null);
  const today = new Date();
  const parsedDate = value
    ? (() => {
        const [y, m, d] = value.split("-");
        return new Date(Number(y), Number(m) - 1, Number(d));
      })()
    : null;
  const [viewYear, setViewYear] = useState(() =>
    parsedDate ? parsedDate.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(() =>
    parsedDate ? parsedDate.getMonth() : today.getMonth()
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        (!btnRef.current || !btnRef.current.contains(e.target)) &&
        (!calRef.current || !calRef.current.contains(e.target))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: Math.max(4, rect.right - 240) });
    }
    setOpen((o) => !o);
  };

  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isSelected = (day) => {
    if (!value || !day) return false;
    const [y, m, d] = value.split("-");
    return Number(y) === viewYear && Number(m) - 1 === viewMonth && Number(d) === day;
  };
  const isToday = (day) => {
    if (!day) return false;
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  };
  const handleDay = (day) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };
  const prevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const nextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const displayText = parsedDate
    ? parsedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Set date";

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{
          fontFamily: theme.fonts.ui,
          fontSize: 12,
          fontWeight: value ? 500 : 400,
          color: value ? theme.colors.text : theme.colors.muted,
          background: value ? theme.colors.cardBg : "transparent",
          border: value ? `1px solid ${theme.colors.inputBorder}` : `1px dashed ${theme.colors.inputBorder}`,
          borderRadius: theme.radii.default,
          padding: "3px 9px",
          cursor: "pointer",
          outline: "none",
          lineHeight: 1.5,
        }}
      >
        {displayText}
      </button>
      {open &&
        ReactDOM.createPortal(
          <div
            ref={calRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 99999,
              background: theme.colors.cardBg,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 14,
              boxShadow: "0 8px 30px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
              padding: "14px 12px 10px",
              width: 240,
              userSelect: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <button
                onClick={prevMonth}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: theme.colors.text,
                  fontSize: 18,
                  padding: "2px 8px",
                  borderRadius: theme.radii.small,
                  lineHeight: 1,
                  fontFamily: theme.fonts.ui,
                }}
              >
                {"<"}
              </button>
              <span
                style={{
                  fontFamily: theme.fonts.ui,
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.colors.text,
                }}
              >
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                onClick={nextMonth}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: theme.colors.text,
                  fontSize: 18,
                  padding: "2px 8px",
                  borderRadius: theme.radii.small,
                  lineHeight: 1,
                  fontFamily: theme.fonts.ui,
                }}
              >
                {">"}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div
                  key={d}
                  style={{
                    textAlign: "center",
                    fontFamily: theme.fonts.ui,
                    fontSize: 10,
                    fontWeight: 700,
                    color: theme.colors.muted,
                    letterSpacing: "0.05em",
                    paddingBottom: 4,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {cells.map((day, i) => {
                const sel = isSelected(day);
                const tod = isToday(day);
                return (
                  <button
                    key={i}
                    onClick={() => day && handleDay(day)}
                    disabled={!day}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      border: "none",
                      borderRadius: theme.radii.small,
                      cursor: day ? "pointer" : "default",
                      background: sel
                        ? theme.colors.primary
                        : tod
                          ? theme.colors.streakGradientStart
                          : "transparent",
                      color: sel ? "white" : tod ? theme.colors.primary : day ? theme.colors.text : "transparent",
                      fontFamily: theme.fonts.ui,
                      fontSize: 12,
                      fontWeight: sel || tod ? 600 : 400,
                      outline: "none",
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    {day || ""}
                  </button>
                );
              })}
            </div>
            {value && (
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: `1px solid ${theme.colors.subtle}`,
                  textAlign: "center",
                }}
              >
                <button
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  style={{
                    fontFamily: theme.fonts.ui,
                    fontSize: 11,
                    color: theme.colors.muted,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Clear date
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
