
export default function EmptyState({ title = "No data", subtitle }) {
  return (
    <div style={wrap}>
      <p style={titleStyle}>{title}</p>
      {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
    </div>
  );
}

const wrap = {
  textAlign: "center",
  padding: "40px 20px",
};

const titleStyle = {
  fontSize: 16,
  fontWeight: 700,
  color: "var(--color-gray-900)",
  margin: 0,
};

const subtitleStyle = {
  marginTop: 6,
  color: "var(--color-slate-500)",
  fontSize: 14,
  margin: "6px 0 0",
};