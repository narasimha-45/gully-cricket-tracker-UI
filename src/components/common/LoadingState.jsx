/**
 * Shared loading indicator. Replaces the same spinner+message markup that
 * used to be copy-pasted (with slightly different styles each time) across
 * BattingStats, BowlingStats, MiscStats, TeamStats, and others.
 */
export default function LoadingState({ label = "Loading..." }) {
  return (
    <div style={wrap}>
      <div style={spinner} />
      <p style={text}>{label}</p>
    </div>
  );
}

const wrap = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "48px 0",
};

const spinner = {
  width: 30,
  height: 30,
  border: "3px solid var(--color-indigo-100)",
  borderTop: "3px solid var(--color-indigo-600)",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const text = {
  marginTop: 14,
  color: "var(--color-slate-500)",
  fontSize: 14,
  fontWeight: 500,
};