import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSeasonStats } from "../context/SeasonStatsContext";

export default function BowlingStats({
  isOverall = false,
}) {
  const { seasonId } = useParams();

  const context =
    useSeasonStats();

  const bowlingStats =
    !isOverall
      ? context?.bowlingStats
      : null;

  const setBowlingStats =
    !isOverall
      ? context?.setBowlingStats
      : null;

  const API =
    import.meta.env.VITE_API_BASE_URL;

  /* OVERALL LOCAL STATE */

  const [
    overallStats,
    setOverallStats,
  ] = useState(null);

  const players = isOverall
    ? overallStats || []
    : bowlingStats || [];

  const [loading, setLoading] =
    useState(false);

  const [sortKey, setSortKey] =
    useState("wickets");

  const [sortDir, setSortDir] =
    useState("desc");

  /* LOAD ONLY ONCE */

  useEffect(() => {
    if (
      isOverall &&
      overallStats
    )
      return;

    if (
      !isOverall &&
      bowlingStats
    )
      return;

    loadStats();
  }, [seasonId, isOverall]);

  const loadStats = async () => {
    try {
      setLoading(true);

      const endpoint =
        isOverall
          ? `${API}/api/stats/overall/bowling`
          : `${API}/api/stats/season/${seasonId}/bowling`;

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
        setBowlingStats(
          json.data || []
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const ballsToOvers = (
    balls = 0
  ) => {
    const overs = Math.floor(
      balls / 6
    );

    const rem = balls % 6;

    return `${overs}.${rem}`;
  };

  const calcEco = (
    runs,
    balls
  ) => {
    if (!balls) return "0.00";

    return (
      runs /
      (balls / 6)
    ).toFixed(2);
  };

  const calcAvg = (
    runs,
    wickets
  ) => {
    if (!wickets) return "–";

    return (
      runs / wickets
    ).toFixed(2);
  };

  const getEco = (p) => {
    if (!p.balls) return 0;

    return (
      p.runs /
      (p.balls / 6)
    );
  };

  const getAvg = (p) => {
    if (!p.wickets) return 0;

    return p.runs / p.wickets;
  };

  /* SORT */

  const sortedPlayers = [
    ...players,
  ].sort((a, b) => {
    let av = 0;
    let bv = 0;

    switch (sortKey) {
      case "innings":
        av = a.innings;
        bv = b.innings;
        break;

      case "wickets":
        av = a.wickets;
        bv = b.wickets;
        break;

      case "runs":
        av = a.runs;
        bv = b.runs;
        break;

      case "overs":
        av = a.balls;
        bv = b.balls;
        break;

      case "eco":
        av = getEco(a);
        bv = getEco(b);
        break;

      case "avg":
        av = getAvg(a);
        bv = getAvg(b);
        break;

      default:
        av = 0;
        bv = 0;
    }

    return sortDir === "asc"
      ? av - bv
      : bv - av;
  });

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

  if (
    loading &&
    players.length === 0
  ) {
    return (
      <div style={loadingWrap}>
        <div style={spinner}></div>

        <p style={loadingText}>
          Loading bowling stats...
        </p>
      </div>
    );
  }

  return (
    <div style={page}>
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
          label="W"
          col="wickets"
        />

        <SortHeader
          label="R"
          col="runs"
        />

        <SortHeader
          label="O"
          col="overs"
        />

        <SortHeader
          label="Eco"
          col="eco"
        />

        <SortHeader
          label="Avg"
          col="avg"
        />
      </div>

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

          <span style={wickets}>
            {p.wickets}
          </span>

          <span style={center}>
            {p.runs}
          </span>

          <span style={center}>
            {ballsToOvers(
              p.balls
            )}
          </span>

          <span style={eco}>
            {calcEco(
              p.runs,
              p.balls
            )}
          </span>

          <span style={avg}>
            {calcAvg(
              p.runs,
              p.wickets
            )}
          </span>
        </div>
      ))}

      {players.length === 0 && (
        <div style={emptyWrap}>
          <p style={emptyTitle}>
            No bowling stats
          </p>

          <p style={emptySub}>
            Completed matches will
            appear here
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

  gridTemplateColumns: "2.6fr repeat(6,1fr)",

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

  boxShadow: "0 2px 10px rgba(15,23,42,0.05)",

  border: "1px solid #eef2ff",

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

const wickets = {
  textAlign: "center",

  fontWeight: 800,

  color: "#dc2626",
};

const eco = {
  textAlign: "center",

  fontWeight: 700,

  color: "#2563eb",
};

const avg = {
  textAlign: "center",

  fontWeight: 700,

  color: "#059669",
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

  border: "3px solid #e0e7ff",

  borderTop: "3px solid #4338ca",

  borderRadius: "50%",

  animation: "spin 0.8s linear infinite",
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
