import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSeasonStats } from "../context/SeasonStatsContext";

export default function BattingStats({
  isOverall = false,
}) {
  const { seasonId } = useParams();

  const API =
    import.meta.env.VITE_API_BASE_URL;

  const context =
    useSeasonStats();

  /* ---------------- CONTEXT ---------------- */

  const battingStats =
    !isOverall
      ? context?.battingStats
      : null;

  const setBattingStats =
    !isOverall
      ? context?.setBattingStats
      : null;

  /* ---------------- LOCAL STATE FOR OVERALL ---------------- */

  const [
    overallStats,
    setOverallStats,
  ] = useState(null);

  const players = isOverall
    ? overallStats || []
    : battingStats || [];

  const [loading, setLoading] =
    useState(false);

  const [sortKey, setSortKey] =
    useState("runs");

  const [sortDir, setSortDir] =
    useState("desc");

  /* ---------------- LOAD ONLY ONCE ---------------- */

  useEffect(() => {
    if (
      isOverall &&
      overallStats
    )
      return;

    if (
      !isOverall &&
      battingStats
    )
      return;

    loadStats();
  }, [seasonId, isOverall]);

  /* ---------------- FETCH ---------------- */

  const loadStats = async () => {
    try {
      setLoading(true);

      const endpoint =
        isOverall
          ? `${API}/api/stats/overall/batting`
          : `${API}/api/stats/season/${seasonId}/batting`;

      const res = await fetch(
        endpoint
      );

      const json =
        await res.json();

      if (isOverall) {
        setOverallStats(
          json.data || []
        );
      } else {
        setBattingStats(
          json.data || []
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- HELPERS ---------------- */

  const getSR = (p) =>
    p.balls
      ? (p.runs / p.balls) *
        100
      : 0;

  const getAvg = (p) => {
    const outs =
      p.innings -
      (p.notOuts || 0);

    if (outs <= 0) return 0;

    return p.runs / outs;
  };

  const calcSR = (
    runs,
    balls
  ) => {
    if (!balls) return "0.00";

    return (
      (runs / balls) *
      100
    ).toFixed(2);
  };

  /* ---------------- SORT ---------------- */

  const sortedPlayers = [
    ...players,
  ].sort((a, b) => {
    let av = 0;
    let bv = 0;

    switch (sortKey) {
      case "runs":
        av = a.runs;
        bv = b.runs;
        break;

      case "sr":
        av = getSR(a);
        bv = getSR(b);
        break;

      case "avg":
        av = getAvg(a);
        bv = getAvg(b);
        break;

      case "fours":
        av = a.fours;
        bv = b.fours;
        break;

      case "ducks":
        av = a.ducks;
        bv = b.ducks;
        break;

      case "innings":
        av = a.innings;
        bv = b.innings;
        break;

      default:
        av = 0;
        bv = 0;
    }

    return sortDir === "asc"
      ? av - bv
      : bv - av;
  });

  /* ---------------- LOADING ---------------- */

  if (
    loading &&
    players.length === 0
  ) {
    return (
      <div style={loadingWrap}>
        <div style={spinner}></div>

        <p style={loadingText}>
          Loading batting stats...
        </p>
      </div>
    );
  }

  /* ---------------- SORT HEADER ---------------- */

  const SortHeader = ({
    label,
    col,
  }) => (
    <span
      style={sortableHeader}
      onClick={() => {
        if (sortKey === col) {
          setSortDir(
            sortDir === "asc"
              ? "desc"
              : "asc"
          );
        } else {
          setSortKey(col);
          setSortDir("desc");
        }
      }}
    >
      {label}

      {sortKey === col &&
        (sortDir === "asc"
          ? " ▲"
          : " ▼")}
    </span>
  );

  /* ---------------- UI ---------------- */

  return (
    <div style={page}>
      {/* HEADER */}
      <div
        style={{
          ...rowBase,
          ...headerRow,
        }}
      >
        <span style={playerHeader}>
          Player
        </span>

        <SortHeader
          label="I"
          col="innings"
        />

        <SortHeader
          label="R"
          col="runs"
        />

        <SortHeader
          label="SR"
          col="sr"
        />

        <SortHeader
          label="4s"
          col="fours"
        />

        <SortHeader
          label="0s"
          col="ducks"
        />
      </div>

      {/* ROWS */}
      {sortedPlayers.map((p) => (
        <div
          key={p._id}
          style={{
            ...rowBase,
            ...dataRow,
          }}
        >
          <span style={playerCell}>
            {p.name}
          </span>

          <span style={center}>
            {p.innings}
          </span>

          <span style={runs}>
            {p.runs}
          </span>

          <span style={sr}>
            {calcSR(
              p.runs,
              p.balls
            )}
          </span>

          <span style={center}>
            {p.fours}
          </span>

          <span style={center}>
            {p.ducks}
          </span>
        </div>
      ))}

      {/* EMPTY */}
      {players.length === 0 && (
        <div style={emptyWrap}>
          <p style={emptyTitle}>
            No batting stats
          </p>

          <p style={emptySub}>
            Completed matches
            will appear here
          </p>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const page = {
  display: "flex",

  flexDirection: "column",

  gap: 10,
};

const rowBase = {
  display: "grid",

  gridTemplateColumns:
    "2.6fr repeat(5,1fr)",

  alignItems: "center",
};

const headerRow = {
  padding: "0 14px 8px",

  fontSize: 12,

  fontWeight: 700,

  color: "#64748b",
};

const dataRow = {
  background: "#ffffff",

  padding: "14px",

  borderRadius: 18,

  boxShadow:
    "0 2px 10px rgba(15,23,42,0.05)",

  border:
    "1px solid #eef2ff",

  fontSize: 14,
};

const sortableHeader = {
  textAlign: "center",

  cursor: "pointer",

  userSelect: "none",
};

const playerHeader = {
  textAlign: "left",
};

const playerCell = {
  fontWeight: 700,

  color: "#111827",

  textAlign: "left",

  fontSize: 14,
};

const center = {
  textAlign: "center",

  fontWeight: 600,

  color: "#374151",
};

const runs = {
  textAlign: "center",

  fontWeight: 800,

  color: "#4338ca",
};

const sr = {
  textAlign: "center",

  fontWeight: 700,

  color: "#1d4ed8",
};

const loadingWrap = {
  display: "flex",

  flexDirection: "column",

  alignItems: "center",

  justifyContent: "center",

  marginTop: 50,
};

const loadingText = {
  marginTop: 14,

  color: "#64748b",

  fontSize: 14,
};

const spinner = {
  width: 28,

  height: 28,

  border:
    "3px solid #e0e7ff",

  borderTop:
    "3px solid #4338ca",

  borderRadius: "50%",

  animation:
    "spin 0.8s linear infinite",
};

const emptyWrap = {
  marginTop: 40,

  textAlign: "center",
};

const emptyTitle = {
  fontSize: 16,

  fontWeight: 700,

  color: "#111827",
};

const emptySub = {
  marginTop: 6,

  color: "#64748b",

  fontSize: 14,
};