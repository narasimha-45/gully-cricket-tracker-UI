import { useEffect, useRef, useState } from "react";
import { api } from "../api";

export function TeamSearch({
  label,
  value,
  setValue,
  otherSelectedId,
  seasonId,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const [results, setResults] = useState([]);

  const [loading, setLoading] = useState(false);

  const containerRef = useRef(null);

  // IMPORTANT FIX
  // ALWAYS RETURN STRING
  const normalizePlayerName = (player) => {
    if (!player) return "";

    // already string
    if (typeof player === "string") {
      return player.trim();
    }

    // object
    if (typeof player === "object") {
      return (
        player.displayName ||
        player.name ||
        player.playerName ||
        ""
      ).trim();
    }

    return "";
  };

  useEffect(() => {
    if (!value.query.trim()) {
      setResults([]);
      return;
    }

    const fetchTeams = async () => {
      try {
        setLoading(true);

        const json = await api.teams.searchTeams(value.query);
        const filtered = (json || []).filter(
          (t) => t.teamName !== otherSelectedId,
        );

        setResults(filtered);
      } catch (err) {
        console.error("Team search failed", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchTeams, 300);

    return () => clearTimeout(timer);
  }, [value.query, otherSelectedId]);

  useEffect(() => {
    const clickOut = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", clickOut);

    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        flex: 1,
      }}
      ref={containerRef}
    >
      <label style={inputLabel}>{label}</label>

      <div style={inputWrapper}>
        <input
          style={searchInput}
          placeholder="Search team name..."
          value={value.query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setValue({
              id: "",
              name: "",
              query: e.target.value,
              players: [],
            });

            setIsOpen(true);
          }}
        />

        {value.name && !loading && <span style={checkIcon}>✓</span>}

        {loading && <div style={miniSpinner}></div>}
      </div>

      {isOpen && value.query.trim() && (
        <div style={dropdown}>
          {results.length > 0 ? (
            results.map((t) => (
              <div
                key={t.teamId}
                style={dropItem}
                onClick={async () => {
                  setValue({
                    id: t.teamId,
                    name: t.teamName,
                    query: t.teamName,
                    players: [],
                  });

                  setLoading(true);

                  try {
                    const json = await api.teams.getTeamSeasonPlayers(t.teamId, seasonId);
                    const players = json || [];

                    setValue({
                      id: t.teamId,
                      name: t.teamName,
                      query: t.teamName,

                      // CONVERT API RESPONSE -> STRING ARRAY
                      players: players
                        .map((p) => {
                          if (typeof p === "string") {
                            return p.trim();
                          }

                          if (typeof p === "object" && p !== null) {
                            return (p.playerName || p.name || "").trim();
                          }

                          return "";
                        })
                        .filter(Boolean),
                    });
                  } catch (err) {
                    console.error("Failed to fetch team details", err);
                  } finally {
                    setLoading(false);
                    setIsOpen(false);
                  }
                }}
              >
                <div style={teamIcon}>🛡️</div>

                <div>
                  <div style={teamNameStyle}>{t.teamName}</div>
                </div>
              </div>
            ))
          ) : !loading ? (
            <div style={dropItem} onClick={() => setIsOpen(false)}>
              <div style={newTeamIcon}>+</div>

              <div>
                <div style={teamNameStyle}>New Team: "{value.query}"</div>

                <div style={teamMeta}>Will be created for this match</div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

const miniSpinner = {
  position: "absolute",
  right: 16,
  top: "50%",
  transform: "translateY(-50%)",
  width: 16,
  height: 16,
  border: "2px solid var(--color-slate-200)",
  borderTop: "2px solid var(--color-indigo-600)",
  borderRadius: "50%",
  animation: "spin 0.6s linear infinite",
};

const container = {
  padding: "20px",
  maxWidth: 600,
  margin: "0 auto",
  paddingBottom: 100,
};

const inputLabel = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--color-slate-400)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 8,
  display: "block",
};

const inputWrapper = {
  position: "relative",
};

const searchInput = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "2px solid var(--color-slate-100)",
  fontSize: 15,
  fontWeight: 500,
  outline: "none",
  transition: "all 0.2s",
  background: "var(--color-slate-50)",
};

const checkIcon = {
  position: "absolute",
  right: 16,
  top: "50%",
  transform: "translateY(-50%)",
  color: "var(--color-emerald-500)",
  fontWeight: 900,
};

const dropdown = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  background: "white",
  borderRadius: 16,
  border: "1px solid var(--color-slate-200)",
  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  zIndex: 100,
  maxHeight: 220,
  overflowY: "auto",
};

const dropItem = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  cursor: "pointer",
  borderBottom: "1px solid var(--color-slate-50)",
};

const teamIcon = {
  width: 36,
  height: 36,
  borderRadius: 10,
  background: "var(--color-slate-100)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
};

const newTeamIcon = {
  width: 36,
  height: 36,
  borderRadius: 10,
  background: "#ecfdf5",
  color: "var(--color-emerald-600)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
  fontWeight: 700,
};

const teamNameStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "var(--color-slate-900)",
};

const teamMeta = {
  fontSize: 11,
  color: "var(--color-slate-400)",
};