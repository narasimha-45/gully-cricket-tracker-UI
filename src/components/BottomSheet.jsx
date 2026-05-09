export default function BottomSheet({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div style={overlay} onClick={onClose}>
      <div
        style={sheet}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={header}>
          <span>{title}</span>
          <button onClick={onClose}>✕</button>
        </div>

        <div style={content}>
          {children}
        </div>
      </div>
    </div>
  );
}


const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.3)",
  zIndex: 1000,
};

const sheet = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  background: "#fff",
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  padding: 16,
  animation: "slideUp 0.25s ease-out",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  fontWeight: 600,
  marginBottom: 12,
};

const content = {
  maxHeight: "70vh",
  overflowY: "auto",
};
