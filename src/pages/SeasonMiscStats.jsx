import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function SeasonMiscStats() {
  const { seasonId } = useParams();
  const API = import.meta.env.VITE_API_BASE_URL;

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${API}/api/stats/season/${seasonId}/misc`
        );
        const json = await res.json();
        setPlayers(json.data || []);
      } catch (e) {
        console.error("Failed to load misc stats", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [seasonId]);

  if (loading) {
    return (
      <p style={{ textAlign: "center", color: "#6b7280", marginTop: 40 }}>
        Loading misc stats…
      </p>
    );
  }

  return (
    <div style={page}>
      {/* HEADER */}
      <div style={{ ...rowBase, ...headerRow }}>
        <span style={playerHeader}>Player</span>
        <span style={center}>C</span>
        <span style={center}>RO</span>
        <span style={center}>MoM</span>
      </div>

      {/* ROWS */}
      {players.map((p) => (
        <div key={p._id} style={{ ...rowBase, ...dataRow }}>
          <span style={playerCell}>{p.name}</span>
          <span style={center}>{p.catches || 0}</span>
          <span style={center}>{p.runOuts || 0}</span>
          <span style={mom}>{p.mom || 0}</span>
        </div>
      ))}

      {players.length === 0 && (
        <p style={emptyText}>No misc stats available</p>
      )}
    </div>
  );
}

/* ================= STYLES (MATCH BOWLING) ================= */

const page = {
  padding: 12,
};

/* GRID */
const rowBase = {
  display: "grid",
  gridTemplateColumns: "2.6fr repeat(3, 1fr)", // Player + 3 stats
  alignItems: "center",
  padding: "10px 12px",
};

/* HEADER */
const headerRow = {
  fontSize: 12,
  fontWeight: 700,
  color: "#6b7280",
  borderBottom: "1px solid #e5e7eb",
  marginBottom: 8,
};

/* DATA ROW */
const dataRow = {
  background: "#ffffff",
  borderRadius: 14,
  marginBottom: 10,
  boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
  fontSize: 14,
};

/* CELLS */
const playerHeader = {
  textAlign: "left",
};

const playerCell = {
  fontWeight: 700,
  color: "#111827",
  textAlign: "left",
};

const center = {
  textAlign: "center",
  fontWeight: 600,
  color: "#374151",
};

const mom = {
  textAlign: "center",
  fontWeight: 800,
  color: "#4f46e5", // highlight MoM
};

const emptyText = {
  textAlign: "center",
  color: "#6b7280",
  marginTop: 40,
};
