// components/InsightsTab.jsx

import { useState } from "react";
import { deriveInsights } from "../utils/deriveInsights";
import styles from "./InsightsTab.module.css";

const INN_COLORS = [
  "var(--color-indigo-600)",
  "var(--color-amber-500)",
  "var(--color-red-600)",
  "var(--color-green-600)",
];

const BADGE_COLORS = [
  "var(--color-indigo-600)",
  "var(--color-green-600)",
  "var(--color-violet-600)",
  "var(--color-amber-500)",
  "var(--color-red-600)",
  "#0891b2",
];

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "?";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function badgeColor(name = "") {
  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }

  return BADGE_COLORS[hash % BADGE_COLORS.length];
}

/* Catmull-Rom → cubic Bezier conversion, so score lines read as
   smooth momentum rather than a jagged connect-the-dots trace. */
function smoothPath(pts) {
  if (pts.length === 0) return "";

  if (pts.length === 1) {
    return `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  }

  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;

    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;

    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }

  return d;
}

export default function InsightsTab({ match }) {
  const data = deriveInsights(match);

  if (!data) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M12 7.5v5l3.2 2"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <p>No data yet</p>
        <span>Insights appear after the first ball.</span>
      </div>
    );
  }

  const { cards, oversByInnings, h2hList, totalOvers } = data;

  const battingCards = cards.filter((c) => c.group === "batting");

  const bowlingCards = cards.filter((c) => c.group === "bowling");

  const momentCard = cards.find((c) => c.group === "moment");

  return (
    <div className={styles.wrapper}>
      {/* Run Progression */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span>Run Progression</span>

          <div className={styles.graphLegend}>
            {oversByInnings.map((inn, i) => (
              <span key={inn.inningsIdx ?? i} className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{
                    background: INN_COLORS[i % INN_COLORS.length],
                    color: INN_COLORS[i % INN_COLORS.length],
                  }}
                />

                {inn.battingTeam}
              </span>
            ))}
          </div>
        </div>

        <LineGraph oversByInnings={oversByInnings} totalOvers={totalOvers} />
      </div>

      {/* Over Battle */}
      <OverBattle oversByInnings={oversByInnings} />

      {/* Batting */}
      {battingCards.length > 0 && (
        <div className={styles.cardGroup}>
          <div className={styles.groupLabel}>Batting</div>

          <div className={styles.cardsGrid}>
            {battingCards.map((card, i) => (
              <StatCard key={`${card.label}-${i}`} {...card} />
            ))}
          </div>
        </div>
      )}

      {/* Bowling */}
      {bowlingCards.length > 0 && (
        <div className={styles.cardGroup}>
          <div className={styles.groupLabel}>Bowling</div>

          <div className={styles.cardsGrid}>
            {bowlingCards.map((card, i) => (
              <StatCard key={`${card.label}-${i}`} {...card} />
            ))}
          </div>
        </div>
      )}

      {/* Standout Moment */}
      {momentCard && <MomentBanner card={momentCard} />}

      {/* Head to Head */}
      {h2hList.length > 0 && <H2HSection h2hList={h2hList} />}
    </div>
  );
}

/* ============================================================
   RUN PROGRESSION GRAPH
   ============================================================ */

function LineGraph({ oversByInnings, totalOvers }) {
  const [tooltip, setTooltip] = useState(null);

  const W = 320;
  const H = 170;

  const PAD = {
    top: 12,
    right: 16,
    bottom: 32,
    left: 34,
  };

  const chartW = W - PAD.left - PAD.right;

  const chartH = H - PAD.top - PAD.bottom;

  const allCum = oversByInnings.flatMap((inn) =>
    inn.points.map((p) => p.cumulative),
  );

  const maxRuns = Math.max(...allCum, 10);

  const safeTotalOvers = totalOvers || 1;

  const xScale = (over) => (over / safeTotalOvers) * chartW;

  const yScale = (runs) => chartH - (runs / maxRuns) * chartH;

  const yTicks = [
    0,
    Math.round(maxRuns * 0.25),
    Math.round(maxRuns * 0.5),
    Math.round(maxRuns * 0.75),
    maxRuns,
  ];

  const uniqueYTicks = [...new Set(yTicks)];

  const xTickStep = safeTotalOvers <= 10 ? 1 : safeTotalOvers <= 20 ? 2 : 5;

  const xTicks = Array.from(
    {
      length: Math.floor(safeTotalOvers / xTickStep) + 1,
    },
    (_, i) => i * xTickStep,
  );

  const toScaledPts = (points) =>
    points.map((p) => [xScale(p.over), yScale(p.cumulative)]);

  const toArea = (points) => {
    if (!points.length) {
      return "";
    }

    const pts = toScaledPts(points);

    const line = smoothPath(pts);

    const last = pts[pts.length - 1];

    const first = pts[0];

    return `${line} L ${last[0].toFixed(1)} ${chartH} L ${first[0].toFixed(1)} ${chartH} Z`;
  };

  const overLookup = oversByInnings.map((inn) => {
    const map = {};

    inn.points.forEach((p) => {
      map[p.over] = p;
    });

    return {
      battingTeam: inn.battingTeam,
      map,
    };
  });

  const allOvers = [
    ...new Set(oversByInnings.flatMap((inn) => inn.points.map((p) => p.over))),
  ].sort((a, b) => a - b);

  const updateTooltip = (clientX, svg) => {
    if (!allOvers.length) {
      setTooltip(null);
      return;
    }

    const rect = svg.getBoundingClientRect();

    const rawX = (clientX - rect.left) * (W / rect.width) - PAD.left;

    const overUnder = (rawX / chartW) * safeTotalOvers;

    const nearest = allOvers.reduce(
      (best, current) =>
        Math.abs(current - overUnder) < Math.abs(best - overUnder)
          ? current
          : best,
      allOvers[0],
    );

    const items = oversByInnings
      .map((inn, i) => {
        const pt = overLookup[i].map[nearest];

        return {
          team: inn.battingTeam,

          color: INN_COLORS[i % INN_COLORS.length],

          runs: pt ? pt.cumulative : null,

          wickets: pt ? (pt.wickets ?? 0) : null,

          overRuns: pt ? (pt.runs ?? 0) : null,
        };
      })
      .filter((item) => item.runs !== null);

    if (!items.length) {
      setTooltip(null);
      return;
    }

    const tx = xScale(nearest) + PAD.left;

    const ty = PAD.top + 4;

    setTooltip({
      x: tx,
      y: ty,
      over: nearest,
      items,
    });
  };

  const handlePointerMove = (e) => {
    updateTooltip(e.clientX, e.currentTarget);
  };

  return (
    <div className={styles.graphWrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{
          display: "block",
          touchAction: "pan-y",
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setTooltip(null)}
      >
        <g transform={`translate(${PAD.left}, ${PAD.top})`}>
          {/* Grid */}
          {uniqueYTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={0}
                y1={yScale(tick).toFixed(1)}
                x2={chartW}
                y2={yScale(tick).toFixed(1)}
                stroke="var(--color-slate-200)"
                strokeWidth="1"
              />

              <text
                x={-6}
                y={yScale(tick).toFixed(1)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="9"
                fill="var(--color-slate-400)"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* X ticks */}
          {xTicks.map((tick) => (
            <text
              key={tick}
              x={xScale(tick).toFixed(1)}
              y={chartH + 14}
              textAnchor="middle"
              fontSize="9"
              fill="var(--color-slate-400)"
            >
              {tick}
            </text>
          ))}

          {/* Innings lines */}
          {oversByInnings.map((inn, i) => {
            const color = INN_COLORS[i % INN_COLORS.length];

            const pts = toScaledPts(inn.points);

            return (
              <g key={inn.inningsIdx ?? i}>
                <path d={toArea(inn.points)} fill={color} fillOpacity="0.07" />

                <path
                  d={smoothPath(pts)}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Latest point marker keeps the current score legible at a glance */}
                {pts.length > 0 && (
                  <circle
                    cx={pts[pts.length - 1][0].toFixed(1)}
                    cy={pts[pts.length - 1][1].toFixed(1)}
                    r="3"
                    fill={color}
                    stroke="white"
                    strokeWidth="1.5"
                  />
                )}

                {inn.points
                  .filter((p) => p.wicketsThisOver > 0)
                  .map((p) => (
                    <circle
                      key={p.over}
                      cx={xScale(p.over).toFixed(1)}
                      cy={yScale(p.cumulative).toFixed(1)}
                      r="4"
                      fill="var(--color-red-500)"
                      stroke="white"
                      strokeWidth="1.5"
                    />
                  ))}
              </g>
            );
          })}

          {/* Hover line */}
          {tooltip && (
            <line
              x1={tooltip.x - PAD.left}
              y1={0}
              x2={tooltip.x - PAD.left}
              y2={chartH}
              stroke="var(--color-slate-500)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          )}

          {/* Axes */}
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={chartH}
            stroke="var(--color-slate-200)"
            strokeWidth="1"
          />

          <line
            x1={0}
            y1={chartH}
            x2={chartW}
            y2={chartH}
            stroke="var(--color-slate-200)"
            strokeWidth="1"
          />
        </g>

        {/* Tooltip */}
        {tooltip &&
          (() => {
            const boxW = 118;
            const lineH = 16;

            const boxH = 20 + tooltip.items.length * lineH + 4;

            let bx = tooltip.x + 6;

            if (bx + boxW > W - 4) {
              bx = tooltip.x - boxW - 6;
            }

            const by = Math.min(tooltip.y, H - boxH - 4);

            return (
              <g>
                <rect
                  x={bx}
                  y={by}
                  width={boxW}
                  height={boxH}
                  rx="8"
                  fill="white"
                  stroke="var(--color-slate-200)"
                  strokeWidth="1"
                  style={{
                    filter: "drop-shadow(0 3px 8px rgba(15,23,42,0.14))",
                  }}
                />

                <text
                  x={bx + 8}
                  y={by + 13}
                  fontSize="9"
                  fontWeight="700"
                  fill="var(--color-slate-600)"
                >
                  Over {tooltip.over}
                </text>

                {tooltip.items.map((item, idx) => (
                  <g key={idx}>
                    <circle
                      cx={bx + 10}
                      cy={by + 22 + idx * lineH}
                      r="3.5"
                      fill={item.color}
                    />

                    <text
                      x={bx + 18}
                      y={by + 26 + idx * lineH}
                      fontSize="9"
                      fontWeight="600"
                      fill="var(--color-slate-800)"
                    >
                      {item.team}: {item.runs}/{item.wickets}
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

/* ============================================================
   OVER BATTLE
   ============================================================ */

function OverBattle({ oversByInnings }) {
  if (oversByInnings.length !== 2) {
    return null;
  }

  const [a, b] = oversByInnings;

  const lastA = a.points[a.points.length - 1];

  const lastB = b.points[b.points.length - 1];

  if (!lastA || !lastB) {
    return null;
  }

  const maxOver = Math.max(lastA.over, lastB.over);

  const rows = [];

  for (let over = 1; over <= maxOver; over++) {
    const pa = a.points.find((p) => p.over === over);

    const pb = b.points.find((p) => p.over === over);

    rows.push({
      over,

      runsA: pa ? pa.runs : null,

      runsB: pb ? pb.runs : null,

      wA: Boolean(pa?.wicketsThisOver),

      wB: Boolean(pb?.wicketsThisOver),
    });
  }

  const maxOverRuns = Math.max(
    6,
    ...rows.map((r) => Math.max(r.runsA || 0, r.runsB || 0)),
  );

  const cumulativeAtOver = (points, over) => {
    let result = 0;

    for (const p of points) {
      if (p.over <= over) {
        result = p.cumulative;
      } else {
        break;
      }
    }

    return result;
  };

  const compOver = Math.min(lastA.over, lastB.over);

  const cumA = cumulativeAtOver(a.points, compOver);

  const cumB = cumulativeAtOver(b.points, compOver);

  const diff = cumB - cumA;

  const leadState = diff === 0 ? "level" : diff > 0 ? "ahead" : "behind";

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Over Battle</div>

      <div className={styles.battleTeams}>
        <span
          className={styles.battleTeamLabel}
          style={{
            color: INN_COLORS[0],
          }}
        >
          {a.battingTeam}
        </span>

        <span
          className={styles.battleTeamLabel}
          style={{
            color: INN_COLORS[1],
          }}
        >
          {b.battingTeam}
        </span>
      </div>

      <div className={styles.leadPill} data-state={leadState}>
        {diff === 0
          ? `${b.battingTeam} level with ${a.battingTeam}'s pace through ${compOver} ov`
          : diff > 0
            ? `${b.battingTeam} +${diff} on ${a.battingTeam}'s pace through ${compOver} ov`
            : `${b.battingTeam} −${Math.abs(diff)} on ${a.battingTeam}'s pace through ${compOver} ov`}
      </div>

      <div className={styles.battleList}>
        {rows.map((r) => (
          <div className={styles.battleRow} key={r.over}>
            <div className={styles.battleSideLeft}>
              <span className={styles.battleValue}>{r.runsA ?? "–"}</span>

              {r.wA && <span className={styles.battleWicket}>W</span>}

              <div className={styles.battleTrack}>
                <div
                  className={styles.battleFillLeft}
                  style={{
                    width: `${((r.runsA || 0) / maxOverRuns) * 100}%`,
                    background: INN_COLORS[0],
                  }}
                />
              </div>
            </div>

            <div className={styles.battleOverLabel}>{r.over}</div>

            <div className={styles.battleSideRight}>
              <div className={styles.battleTrack}>
                <div
                  className={styles.battleFillRight}
                  style={{
                    width: `${((r.runsB || 0) / maxOverRuns) * 100}%`,
                    background: INN_COLORS[1],
                  }}
                />
              </div>

              {r.wB && <span className={styles.battleWicket}>W</span>}

              <span className={styles.battleValue}>{r.runsB ?? "–"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   STAT CARD
   ============================================================ */

function StatCard({ label, value, sub, detail, color }) {
  return (
    <div
      className={styles.card}
      style={{
        "--accent": color,
      }}
    >
      <div className={styles.cardLabel}>{label}</div>

      <div className={styles.cardValue} style={{ color }}>
        {value}
      </div>

      <div className={styles.cardSub}>{sub}</div>

      <div className={styles.cardDetail}>{detail}</div>
    </div>
  );
}

/* ============================================================
   MOMENT BANNER
   ============================================================ */

function MomentBanner({ card }) {
  return (
    <div className={styles.momentBanner}>
      <div className={styles.momentIcon}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L12 3z"
            fill="currentColor"
          />
        </svg>
      </div>

      <div className={styles.momentValue}>{card.value}</div>

      <div className={styles.momentBody}>
        <div className={styles.momentLabel}>{card.label}</div>

        <div className={styles.momentSub}>{card.sub}</div>

        <div className={styles.momentDetail}>{card.detail}</div>
      </div>
    </div>
  );
}

/* ============================================================
   HEAD TO HEAD

   Compact mobile design:

   Group header (tappable disclosure)
   [Avatar] Group Name              3 bowlers  ⌄

   Each matchup stays ONE ROW:
   [Avatar] FULL NAME BAT   5(3)  D2  4s1  SR166.7

   Same batter/bowler combination is aggregated when
   "All Innings" is selected. Only one group is expanded
   by default so the list doesn't dump every matchup on
   the screen at once.
   ============================================================ */

function H2HSection({ h2hList }) {
  const [direction, setDirection] = useState("bvb");

  const [inningsFilter, setInningsFilter] = useState("all");

  const [openGroups, setOpenGroups] = useState(null);

  const inningsOptions = [...new Set(h2hList.map((r) => r.inningsIdx))].sort(
    (a, b) => a - b,
  );

  const filteredRows =
    inningsFilter === "all"
      ? h2hList
      : h2hList.filter((r) => r.inningsIdx === Number(inningsFilter));

  const groupRole = direction === "bvb" ? "BAT" : "BOWL";

  const rowRole = direction === "bvb" ? "BOWL" : "BAT";

  const grouped = {};

  for (const r of filteredRows) {
    const groupName = direction === "bvb" ? r.batter : r.bowler;

    const opponentName = direction === "bvb" ? r.bowler : r.batter;

    if (!grouped[groupName]) {
      grouped[groupName] = {};
    }

    if (!grouped[groupName][opponentName]) {
      grouped[groupName][opponentName] = {
        name: opponentName,
        runs: 0,
        balls: 0,
        dots: 0,
        fours: 0,
        sixes: 0,
        wickets: 0,
      };
    }

    const target = grouped[groupName][opponentName];

    target.runs += r.runs || 0;

    target.balls += r.balls || 0;

    target.dots += r.dots || 0;

    target.fours += r.fours || 0;

    target.sixes += r.sixes || 0;

    target.wickets += r.wickets || 0;
  }

  const groupNames = Object.keys(grouped);

  // Default: expand only the first group so switching direction/filter
  // doesn't leave a wall of collapsed rows to tap through one by one.
  const isOpen = (name, idx) => (openGroups ? openGroups.has(name) : idx === 0);

  const toggleGroup = (name, idx) => {
    setOpenGroups((prev) => {
      const base = prev ?? new Set(groupNames.slice(0, 1));

      const next = new Set(base);

      if (next.has(name) || (!prev && idx === 0)) {
        next.delete(name);
      } else {
        next.add(name);
      }

      return next;
    });
  };

  return (
    <div className={styles.section}>
      {/* Header */}
      <div className={styles.h2hHeader}>
        <span className={styles.sectionTitleText}>Head to Head</span>

        <div className={styles.h2hFilters}>
          <div
            className={styles.segmented}
            role="tablist"
            aria-label="Group by"
          >
            <button
              type="button"
              role="tab"
              aria-selected={direction === "bvb"}
              className={styles.segmentedBtn}
              data-active={direction === "bvb"}
              onClick={() => {
                setDirection("bvb");
                setOpenGroups(null);
              }}
            >
              By Batter
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={direction === "bvs"}
              className={styles.segmentedBtn}
              data-active={direction === "bvs"}
              onClick={() => {
                setDirection("bvs");
                setOpenGroups(null);
              }}
            >
              By Bowler
            </button>
          </div>

          {inningsOptions.length > 1 && (
            <div
              className={styles.segmented}
              role="tablist"
              aria-label="Innings"
            >
              <button
                type="button"
                role="tab"
                aria-selected={inningsFilter === "all"}
                className={styles.segmentedBtn}
                data-active={inningsFilter === "all"}
                onClick={() => {
                  setInningsFilter("all");
                  setOpenGroups(null);
                }}
              >
                All Innings
              </button>

              {inningsOptions.map((idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={inningsFilter === idx}
                  className={styles.segmentedBtn}
                  data-active={inningsFilter === idx}
                  onClick={() => {
                    setInningsFilter(idx);
                    setOpenGroups(null);
                  }}
                >
                  Inn {idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Groups */}
      <div className={styles.h2hWrap}>
        {groupNames.map((groupName, idx) => {
          const opponents = Object.values(grouped[groupName]);

          const open = isOpen(groupName, idx);

          return (
            <div key={groupName} className={styles.h2hGroup}>
              {/* Group player — tap to expand/collapse */}
              <button
                type="button"
                className={styles.h2hGroupHeader}
                aria-expanded={open}
                onClick={() => toggleGroup(groupName, idx)}
              >
                <span
                  className={styles.h2hGroupAvatar}
                  style={{
                    background: badgeColor(groupName),
                  }}
                >
                  {initials(groupName)}
                </span>

                <span className={styles.h2hGroupLabel}>{groupName}</span>

                <span
                  className={`${styles.roleTag} ${styles[`role${groupRole}`]}`}
                >
                  {groupRole}
                </span>

                <span className={styles.h2hGroupCount}>
                  {opponents.length} {rowRole === "BOWL" ? "bowler" : "batter"}
                  {opponents.length === 1 ? "" : "s"}
                </span>

                <svg
                  className={styles.h2hChevron}
                  data-open={open}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Matchups */}
              <div className={styles.h2hRows} data-open={open}>
                <div className={styles.h2hRowsInner}>
                  {opponents.map((r) => {
                    const sr = r.balls
                      ? +((r.runs / r.balls) * 100).toFixed(1)
                      : 0;

                    return (
                      <div key={r.name} className={styles.h2hRow}>
                        {/* Top line: player + headline runs */}
                        <div className={styles.h2hRowTop}>
                          <div className={styles.h2hPlayer}>
                            <span
                              className={styles.h2hAvatar}
                              style={{
                                background: badgeColor(r.name),
                              }}
                            >
                              {initials(r.name)}
                            </span>

                            <span className={styles.h2hName} title={r.name}>
                              {r.name}
                            </span>

                            <span
                              className={`${styles.roleTag} ${
                                styles[`role${rowRole}`]
                              }`}
                            >
                              {rowRole}
                            </span>
                          </div>

                          <span className={styles.h2hRuns}>
                            <strong>{r.runs}</strong>
                            <small>({r.balls}b)</small>
                          </span>
                        </div>

                        {/* Second line: clearly spaced secondary stats */}
                        <div className={styles.h2hStats}>
                          <span
                            className={styles.h2hMiniStat}
                            title="Dot balls"
                          >
                            <span>Dots</span> {r.dots}
                          </span>

                          <span className={styles.h2hMiniStat} title="Fours">
                            <span>4s</span> {r.fours}
                          </span>

                          <span
                            className={`${styles.h2hSr} ${
                              sr >= 150
                                ? styles.good
                                : sr < 80
                                  ? styles.bad
                                  : ""
                            }`}
                          >
                            <span>SR</span> {sr}
                          </span>

                          {r.wickets > 0 && (
                            <span className={styles.wicket}>{r.wickets}W</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
