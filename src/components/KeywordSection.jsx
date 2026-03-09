import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { KEYWORDS } from "../data/keywords";
import { S } from "../utils/storage";

const cardStyle = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
  border: "1px solid #ede9e3",
};

export function KeywordSection({ section, keywords }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debounceTimeoutRef = useRef(null);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const [sourceKeywords, setSourceKeywords] = useState(
    Array.isArray(keywords) ? keywords :
    Array.isArray(KEYWORDS[section]) ? KEYWORDS[section] : []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await S.get("job-dashboard-keywords");
        if (!mounted) return;
        if (Array.isArray(res) && res.length > 0) {
          setSourceKeywords(res);
        } else if (res && Array.isArray(res[section]) && res[section].length > 0) {
          setSourceKeywords(res[section]);
        }
      } catch {
        // ignore and keep seed/default
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const filteredKeywords = sourceKeywords.filter((kw) => kw.toLowerCase().includes(normalizedQuery));

  return (
    <div style={{ ...cardStyle, marginBottom: 10, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: "15px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontWeight: 700,
            fontSize: 14,
            color: "#1a1a1a",
          }}
        >
          {section}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            {sourceKeywords.length} terms
          </span>
          {open ? (
            <ChevronUp size={15} color="#9ca3af" />
          ) : (
            <ChevronDown size={15} color="#9ca3af" />
          )}
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 20px 20px" }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Filter keywords..."
            style={{
              width: "100%",
              padding: "8px 12px",
              border: `1px solid ${isSearchFocused ? "#6b7280" : "#ede9e3"}`,
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "Plus Jakarta Sans",
              background: "#ffffff",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 10,
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <CopyButton text={filteredKeywords.join(", ")} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {filteredKeywords.map((kw, i) => (
              <span
                key={i}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "5px 12px",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 13,
                  color: "#374151",
                  fontWeight: 500,
                }}
              >
                {kw}
              </span>
            ))}
          </div>
          {debouncedQuery.trim() && filteredKeywords.length === 0 && (
            <p
              style={{
                margin: "10px 0 0",
                color: "#9ca3af",
                fontSize: 14,
                fontFamily: "Plus Jakarta Sans",
              }}
            >
              No keywords match.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
