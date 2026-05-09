/* LiveMatch Styles */

export const primaryBtn = {
  padding: "12px 16px",
  borderRadius: 10,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

export const secondaryBtn = {
  padding: "12px 16px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  fontWeight: 600,
  cursor: "pointer",
};

export const keyWide = {
  padding: "14px 0",
  borderRadius: 12,
  background: "#fde68a",
  color: "#92400e",
  fontSize: 16,
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
  touchAction: "manipulation",
};

export const overBox = {
  padding: 12,
  borderRadius: 10,
  background: "#f3f4f6",
  marginBottom: 12,
};

export const overBalls = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 6,
};

export const ballChip = {
  minWidth: 28,
  height: 28,
  borderRadius: "50%",
  background: "#4f46e5",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 600,
};

export const popup = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

export const popupCard = {
  background: "#ffffff",
  padding: "24px 28px",
  borderRadius: 16,
  width: 320,
  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  textAlign: "center",
};

export const popupActions = {
  display: "flex",
  gap: 12,
};

export const popupUndoBtn = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 10,
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  fontWeight: 600,
  cursor: "pointer",
};

export const popupPrimaryBtn = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 10,
  background: "#16a34a",
  color: "#fff",
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
};

export const keyBtn = {
  padding: "14px 0",
  borderRadius: 12,
  background: "#eef2ff",
  fontSize: 18,
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
  touchAction: "manipulation",
};

export const keyWicket = {
  ...keyBtn,
  background: "#fecaca",
  color: "#7f1d1d",
  fontSize: 20,
};

export const keyWicketDisabled = {
  ...keyWicket,
  opacity: 0.5,
  cursor: "not-allowed",
};

export const keyWideActive = {
  ...keyWide,
  outline: "2px solid #f59e0b",
};

export const keypad = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 10,
  marginTop: 16,
};

export const keyWideDisabled = {
  ...keyWide,
  opacity: 0.5,
  cursor: "not-allowed",
};

export const keyUndo = {
  padding: "14px 0",
  borderRadius: 12,
  background: "#e5e7eb",
  color: "#374151",
  fontSize: 18,
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
  touchAction: "manipulation",
};

export const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 12,
};

export const btn = {
  padding: "10px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

export const activeBtn = {
  ...btn,
  background: "#4f46e5",
  color: "#fff",
  border: "none",
};

export const listItem = {
  padding: "10px",
  borderBottom: "1px solid #e5e7eb",
  cursor: "pointer",
};

export const selectedListItem = {
  ...listItem,
  background: "#4f46e5",
  color: "#fff",
};

export const confirmBtn = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 700,
  marginTop: 12,
};

export const keyUndoActive = {
  ...keyUndo,
  background: "#d1d5db",
};

export const keyUndoDisabled = {
  ...keyUndo,
  opacity: 0.5,
  cursor: "not-allowed",
};

export const scoreBtn = {
  padding: "16px 0",
  borderRadius: 12,
  background: "#eef2ff",
  border: "none",
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
};

export const scoreBtnDisabled = {
  ...scoreBtn,
  opacity: 0.4,
  cursor: "not-allowed",
};

export const scoreRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
};

export const crr = {
  fontSize: 13,
  fontWeight: 600,
  color: "#1e40af",
};

export const infoRow = {
  fontSize: 12,
  textAlign: "center",
  color: "#6b7280",
  marginTop: 4,
};

export const tabs = {
  display: "flex",
  gap: 8,
  marginBottom: 16,
};

export const tabBtn = {
  flex: 1,
  padding: 10,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
};

export const activeTab = {
  ...tabBtn,
  background: "#4f46e5",
  color: "#fff",
};

export const headerCard = {
  background: "#eef2ff",
  padding: 12,
  borderRadius: 12,
  marginBottom: 12,
};

export const headerTop = {
  display: "flex",
  justifyContent: "space-between",
  fontWeight: 600,
};

export const editBtn = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#4f46e5",
};

export const scoreMain = {
  fontSize: 20,
  fontWeight: 700,
  marginTop: 6,
};

export const overs = {
  fontSize: 14,
  color: "#6b7280",
};

export const card = {
  background: "#f9fafb",
  padding: 12,
  borderRadius: 12,
  marginBottom: 16,
};

export const tableHeader = {
  display: "grid",
  gridTemplateColumns: "2fr repeat(4,1fr)",
  fontSize: 13,
  color: "#6b7280",
};

export const row = {
  display: "grid",
  gridTemplateColumns: "2fr repeat(4,1fr)",
  padding: "6px 0",
};

export const selectable = (enabled) => ({
  color: enabled ? "#4f46e5" : "#111827",
  fontWeight: 600,
  cursor: enabled ? "pointer" : "default",
  opacity: enabled ? 1 : 0.5,
});
