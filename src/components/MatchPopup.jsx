export default function MatchPopup({
  open,
  title,
  subtitle,

  primaryText,
  primaryLoadingText = "Loading...",
  loading = false,
  onPrimary,

  secondaryText,
  onSecondary,
}) {
  if (!open) return null;

  return (
    <div style={overlay}>
      <div style={card}>
        {/* TOP ACCENT */}
        <div style={accentBar} />

        {/* TITLE */}
        <h2 style={titleStyle}>{title}</h2>

        {/* SUBTITLE */}
        {subtitle && (
          <p style={subtitleStyle}>
            {subtitle}
          </p>
        )}

        {/* PRIMARY BUTTON */}
        <button
          style={{
            ...primaryBtn,
            opacity: loading ? 0.8 : 1,
          }}
          disabled={loading}
          onClick={onPrimary}
        >
          {loading ? (
            <div style={loaderRow}>
              <div style={spinner}></div>
              {primaryLoadingText}
            </div>
          ) : (
            primaryText
          )}
        </button>

        {/* SECONDARY */}
        {secondaryText && onSecondary && (
          <button
            style={secondaryBtn}
            onClick={onSecondary}
          >
            ↺ {secondaryText}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const overlay = {
  position: "fixed",
  inset: 0,

  background: "rgba(15,23,42,0.42)",

  backdropFilter: "blur(10px)",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  padding: 20,

  zIndex: 100,
};

const card = {
  width: "100%",
  maxWidth: 360,

  background: "rgba(255,255,255,0.96)",

  borderRadius: 30,

  padding: "0 26px 24px",

  boxSizing: "border-box",

  textAlign: "center",

  boxShadow:
    "0 25px 60px rgba(15,23,42,0.18)",

  overflow: "hidden",
};

const accentBar = {
  height: 6,

  width: 70,

  borderRadius: 999,

  margin: "18px auto 24px",

  background:
    "linear-gradient(90deg,#4f46e5,#6366f1)",
};

const titleStyle = {
  margin: 0,

  fontSize: 28,

  fontWeight: 700,

  letterSpacing: -0.8,

  color: "#0f172a",

  lineHeight: 1.2,
};

const subtitleStyle = {
  marginTop: 14,

  marginBottom: 0,

  fontSize: 16,

  fontWeight: 500,

  color: "#475569",

  lineHeight: 1.6,
};

const primaryBtn = {
  width: "100%",

  height: 54,

  marginTop: 28,

  border: "none",

  borderRadius: 18,

  background:
    "linear-gradient(135deg,#4f46e5,#4338ca)",

  color: "#fff",

  fontSize: 15,

  fontWeight: 700,

  cursor: "pointer",

  boxShadow:
    "0 10px 30px rgba(79,70,229,0.28)",

  transition: "all 0.2s ease",
};

const secondaryBtn = {
  marginTop: 16,

  border: "none",

  background: "transparent",

  color: "#64748b",

  fontSize: 14,

  fontWeight: 600,

  cursor: "pointer",

  padding: 4,

  transition: "color 0.2s ease",
};

const loaderRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
};

const spinner = {
  width: 16,
  height: 16,

  border:
    "2px solid rgba(255,255,255,0.35)",

  borderTop: "2px solid #fff",

  borderRadius: "50%",

  animation: "spin 0.8s linear infinite",
};