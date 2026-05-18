// components/InsightsTab.jsx
import { useState } from "react";
import { deriveInsights } from "../utils/deriveInsights";
import styles from "./InsightsTab.module.css";

const INN_COLORS = ["#4f46e5", "#f59e0b", "#dc2626", "#16a34a"];
 
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
   SVG Line Graph — IPL style cumulative runs
───────────────────────────────────────────────────────────── */
function LineGraph({ oversByInnings, totalOvers }) {
  const W = 320,
    H = 160;
  const PAD = { top: 12, right: 16, bottom: 28, left: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Max cumulative runs across all innings
  const allCum = oversByInnings.flatMap((inn) =>
    inn.points.map((p) => p.cumulative),
  );
  const maxRuns = Math.max(...allCum, 10);

  // X axis: overs 0..totalOvers
  const xScale = (over) => (over / totalOvers) * chartW;
  const yScale = (runs) => chartH - (runs / maxRuns) * chartH;

  // Y axis labels
  const yTicks = [
    0,
    Math.round(maxRuns * 0.25),
    Math.round(maxRuns * 0.5),
    Math.round(maxRuns * 0.75),
    maxRuns,
  ];

  // X axis labels — every 2 overs or so
  const step = totalOvers <= 10 ? 2 : totalOvers <= 20 ? 5 : 10;
  const xTicks = Array.from(
    { length: Math.floor(totalOvers / step) + 1 },
    (_, i) => i * step,
  );

  const toPath = (points) =>
    points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${xScale(p.over).toFixed(1)} ${yScale(p.cumulative).toFixed(1)}`,
      )
      .join(" ");

  const toArea = (points) => {
    const line = toPath(points);
    const last = points[points.length - 1];
    const first = points[0];
    return `${line} L ${xScale(last.over).toFixed(1)} ${chartH} L ${xScale(first.over).toFixed(1)} ${chartH} Z`;
  };

  return (
    <div className={styles.graphWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        <g transform={`translate(${PAD.left}, ${PAD.top})`}>
          {/* Grid lines */}
          {yTicks.map((t) => (
            <g key={t}>
              <line
                x1={0}
                y1={yScale(t).toFixed(1)}
                x2={chartW}
                y2={yScale(t).toFixed(1)}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={-6}
                y={yScale(t).toFixed(1)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="9"
                fill="#94a3b8"
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
                {/* Shaded area */}
                <path d={toArea(inn.points)} fill={color} fillOpacity="0.08" />
                {/* Line */}
                <path
                  d={toPath(inn.points)}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {/* Dots at each over — only for wicket overs */}
                {inn.points
                  .filter((p) => p.wickets > 0)
                  .map((p) => (
                    <circle
                      key={p.over}
                      cx={xScale(p.over).toFixed(1)}
                      cy={yScale(p.cumulative).toFixed(1)}
                      r="4"
                      fill="#ef4444"
                      stroke="white"
                      strokeWidth="1.5"
                    />
                  ))}
              </g>
            );
          })}

          {/* Axes */}
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={chartH}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <line
            x1={0}
            y1={chartH}
            x2={chartW}
            y2={chartH}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        </g>
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
───────────────────────────────────────────────────────────── */
function H2HSection({ h2hList }) {
  const [direction, setDirection] = useState("bvb"); // bvb | bvs

  const [inningsFilter, setInningsFilter] = useState("all");

  const filteredH2H =
    inningsFilter === "all"
      ? h2hList
      : h2hList.filter(
          (r) => r.inningsIdx === Number(inningsFilter)
        );


  // bvb = Batter vs Bowler → group by bowler, list batters
  // bvs = Bowler vs Batter → group by batter, list bowlers
  const grouped = {};
  for (const r of filteredH2H) {
    const groupKey = direction === "bvb" ? r.bowler : r.batter;
    const rowKey = direction === "bvb" ? r.batter : r.bowler;
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push({ ...r, rowKey });
  }

  const groupLabel = direction === "bvb" ? "Bowler" : "Batter";
  const rowLabel = direction === "bvb" ? "Batter" : "Bowler";

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
                {direction === "bvb" ? "vs " : ""}
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
