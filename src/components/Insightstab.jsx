// components/InsightsTab.jsx
import { useState } from "react";
import { deriveInsights } from "../utils/deriveInsights";
import styles from "./InsightsTab.module.css";

const INN_COLORS = ["#4f46e5", "#f59e0b", "#dc2626", "#16a34a"];

/** Convert ball count → overs string: 7 balls → "1.1", 12 → "2.0" */
function ballsToOvers(balls) {
  const fullOvers = Math.floor(balls / 6);
  const rem = balls % 6;
  return `${fullOvers}.${rem}`;
}

export default function InsightsTab({ match }) {
  const data = deriveInsights(match);

  if (!data) {
    return (
      <div className={styles.empty}>
        <p>No data yet</p>
        <span>Insights appear after the first ball.</span>
      </div>
    );
  }

  const { cards, oversByInnings, h2hList, totalOvers } = data;

  return (
    <div className={styles.wrapper}>
      {/* ── Line graph ───────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          Run Progression
          <div className={styles.graphLegend}>
            {oversByInnings.map((inn, i) => (
              <span key={i} className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ background: INN_COLORS[i % INN_COLORS.length] }}
                />
                {inn.battingTeam}
              </span>
            ))}
          </div>
        </div>
        <LineGraph oversByInnings={oversByInnings} totalOvers={totalOvers} />
      </div>

      {/* ── Stat cards ───────────────────────────────────── */}
      <div className={styles.cardsGrid}>
        {cards.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      {/* ── H2H ─────────────────────────────────────────── */}
      {h2hList.length > 0 && <H2HSection h2hList={h2hList} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SVG Line Graph — cumulative runs per over with hover tooltip
───────────────────────────────────────────────────────────── */
function LineGraph({ oversByInnings, totalOvers }) {
  const [tooltip, setTooltip] = useState(null); // { x, y, items: [{team, runs, wickets, color}] }

  const W = 320,
    H = 170;
  const PAD = { top: 12, right: 16, bottom: 32, left: 34 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allCum = oversByInnings.flatMap((inn) =>
    inn.points.map((p) => p.cumulative)
  );
  const maxRuns = Math.max(...allCum, 10);

  const xScale = (over) => (over / totalOvers) * chartW;
  const yScale = (runs) => chartH - (runs / maxRuns) * chartH;

  // Y axis ticks
  const yTicks = [
    0,
    Math.round(maxRuns * 0.25),
    Math.round(maxRuns * 0.5),
    Math.round(maxRuns * 0.75),
    maxRuns,
  ];

  // X axis: every over number (1, 2, 3 ... totalOvers)
  // Thin out if too many — show every 2 or 5 for readability
  const xTickStep = totalOvers <= 10 ? 1 : totalOvers <= 20 ? 2 : 5;
  const xTicks = Array.from(
    { length: Math.floor(totalOvers / xTickStep) + 1 },
    (_, i) => i * xTickStep
  );

  const toPath = (points) =>
    points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${xScale(p.over).toFixed(1)} ${yScale(p.cumulative).toFixed(1)}`
      )
      .join(" ");

  const toArea = (points) => {
    const line = toPath(points);
    const last = points[points.length - 1];
    const first = points[0];
    return `${line} L ${xScale(last.over).toFixed(1)} ${chartH} L ${xScale(first.over).toFixed(1)} ${chartH} Z`;
  };

  // Build lookup: over → point, per innings
  const overLookup = oversByInnings.map((inn) => {
    const map = {};
    inn.points.forEach((p) => { map[p.over] = p; });
    return { battingTeam: inn.battingTeam, map };
  });

  // All unique over numbers across all innings (for hover zones)
  const allOvers = [
    ...new Set(oversByInnings.flatMap((inn) => inn.points.map((p) => p.over))),
  ].sort((a, b) => a - b);

  const handleMouseMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) * (W / rect.width) - PAD.left;
    const rawY = (e.clientY - rect.top) * (H / rect.height) - PAD.top;

    // Snap to nearest over
    const overUnder = (rawX / chartW) * totalOvers;
    let nearest = allOvers.reduce((best, o) =>
      Math.abs(o - overUnder) < Math.abs(best - overUnder) ? o : best,
      allOvers[0]
    );

    const items = oversByInnings.map((inn, i) => {
      const pt = overLookup[i].map[nearest];
      return {
        team: inn.battingTeam,
        color: INN_COLORS[i % INN_COLORS.length],
        runs: pt ? pt.cumulative : null,
        wickets: pt ? (pt.wickets ?? 0) : null,
        overRuns: pt ? (pt.runs ?? 0) : null,
      };
    }).filter((it) => it.runs !== null);

    if (!items.length) { setTooltip(null); return; }

    // Position tooltip in SVG space
    const tx = xScale(nearest) + PAD.left;
    const ty = PAD.top + 4;

    setTooltip({ x: tx, y: ty, over: nearest, items });
  };

  return (
    <div className={styles.graphWrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <g transform={`translate(${PAD.left}, ${PAD.top})`}>
          {/* Grid lines */}
          {yTicks.map((t) => (
            <g key={t}>
              <line
                x1={0} y1={yScale(t).toFixed(1)}
                x2={chartW} y2={yScale(t).toFixed(1)}
                stroke="#e2e8f0" strokeWidth="1"
              />
              <text
                x={-6} y={yScale(t).toFixed(1)}
                textAnchor="end" dominantBaseline="middle"
                fontSize="9" fill="#94a3b8"
              >
                {t}
              </text>
            </g>
          ))}

          {/* X axis ticks */}
          {xTicks.map((t) => (
            <text
              key={t}
              x={xScale(t).toFixed(1)}
              y={chartH + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#94a3b8"
            >
              {t}
            </text>
          ))}

          {/* Area + line per innings */}
          {oversByInnings.map((inn, i) => {
            const color = INN_COLORS[i % INN_COLORS.length];
            return (
              <g key={inn.inningsIdx}>
                <path d={toArea(inn.points)} fill={color} fillOpacity="0.08" />
                <path
                  d={toPath(inn.points)}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {inn.points.filter((p) => p.wicketsThisOver > 0).map((p) => (
                  <circle
                    key={p.over}
                    cx={xScale(p.over).toFixed(1)}
                    cy={yScale(p.cumulative).toFixed(1)}
                    r="4" fill="#ef4444" stroke="white" strokeWidth="1.5"
                  />
                ))}
              </g>
            );
          })}

          {/* Hover vertical line */}
          {tooltip && (
            <line
              x1={tooltip.x - PAD.left} y1={0}
              x2={tooltip.x - PAD.left} y2={chartH}
              stroke="#64748b" strokeWidth="1" strokeDasharray="3,3"
            />
          )}

          {/* Axes */}
          <line x1={0} y1={0} x2={0} y2={chartH} stroke="#e2e8f0" strokeWidth="1" />
          <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#e2e8f0" strokeWidth="1" />
        </g>

        {/* Tooltip box */}
        {tooltip && (() => {
          const boxW = 110;
          const lineH = 16;
          const boxH = 20 + tooltip.items.length * lineH + 4;
          let bx = tooltip.x + 6;
          if (bx + boxW > W - 4) bx = tooltip.x - boxW - 6;
          const by = Math.min(tooltip.y, H - boxH - 4);

          return (
            <g>
              <rect
                x={bx} y={by} width={boxW} height={boxH}
                rx="6" fill="white"
                stroke="#e2e8f0" strokeWidth="1"
                style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.12))" }}
              />
              <text x={bx + 8} y={by + 13} fontSize="9" fontWeight="700" fill="#475569">
                Over {tooltip.over}
              </text>
              {tooltip.items.map((it, idx) => (
                <g key={idx}>
                  <circle
                    cx={bx + 10} cy={by + 22 + idx * lineH}
                    r="3.5" fill={it.color}
                  />
                  <text
                    x={bx + 18} y={by + 26 + idx * lineH}
                    fontSize="9" fontWeight="600" fill="#1e293b"
                  >
                    {it.team}: {it.runs}/{it.wickets}
                  </text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>
      <div className={styles.graphXLabel}>Overs</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Stat card
───────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, detail, color }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardLabel}>{label}</div>
      <div className={styles.cardValue} style={{ color }}>
        {value}
      </div>
      <div className={styles.cardSub}>{sub}</div>
      <div className={styles.cardDetail}>{detail}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   H2H section with direction dropdown
   FIX: bvb = group by BATTER, list bowlers (Batter vs Bowler)
        bvs = group by BOWLER, list batters (Bowler vs Batter)
───────────────────────────────────────────────────────────── */
function H2HSection({ h2hList }) {
  const [direction, setDirection] = useState("bvb"); // bvb | bvs
  const [inningsFilter, setInningsFilter] = useState("all");

  const filteredH2H =
    inningsFilter === "all"
      ? h2hList
      : h2hList.filter((r) => r.inningsIdx === Number(inningsFilter));

  // bvb = Batter vs Bowler → group by BATTER, rows are bowlers
  // bvs = Bowler vs Batter → group by BOWLER, rows are batters
  const grouped = {};
  for (const r of filteredH2H) {
    const groupKey = direction === "bvb" ? r.batter : r.bowler;
    const rowKey   = direction === "bvb" ? r.bowler : r.batter;
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push({ ...r, rowKey });
  }

  // In bvb: group header = batter name, row label col = "Bowler"
  // In bvs: group header = bowler name, row label col = "Batter"
  const groupLabel = direction === "bvb" ? "Batter" : "Bowler";
  const rowLabel   = direction === "bvb" ? "Bowler" : "Batter";

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitleRow}>
        <span className={styles.sectionTitleText}>Head to Head</span>
        <select
          className={styles.directionSelect}
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
        >
          <option value="bvb">Batter vs Bowler</option>
          <option value="bvs">Bowler vs Batter</option>
        </select>
        <select
          className={styles.directionSelect}
          value={inningsFilter}
          onChange={(e) => setInningsFilter(e.target.value)}
        >
          <option value="all">All Innings</option>
          {[...new Set(h2hList.map((r) => r.inningsIdx))].map((idx) => (
            <option key={idx} value={idx}>
              Innings {idx + 1}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.h2hWrap}>
        {Object.entries(grouped).map(([groupName, rows]) => (
          <div key={groupName} className={styles.h2hGroup}>
            {/* Group header */}
            <div className={styles.h2hGroupHeader}>
              <span className={styles.h2hGroupLabel}>
                {groupName}
              </span>
            </div>

            {/* Row header */}
            <div className={`${styles.h2hRow} ${styles.h2hHead}`}>
              <span>{rowLabel}</span>
              <span>R(B)</span>
              <span>SR</span>
              <span>4s/6s</span>
              <span>W</span>
            </div>

            {/* Data rows */}
            {rows.map((r) => (
              <div key={r.rowKey} className={styles.h2hRow}>
                <span className={styles.h2hName}>{r.rowKey}</span>
                <span>
                  {r.runs}({r.balls})
                </span>
                <span
                  className={
                    r.sr > 150 ? styles.good : r.sr < 80 ? styles.bad : ""
                  }
                >
                  {r.sr}
                </span>
                <span>
                  {r.fours}/{r.sixes}
                </span>
                <span className={r.wickets > 0 ? styles.wicket : ""}>
                  {r.wickets || "—"}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}