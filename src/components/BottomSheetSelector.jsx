import React from "react";
import "./BottomSheetSelector.css";

export default function BottomSheetSelector({
  open,
  title,
  items,
  disabledItems = [],
  onSelect,
  onClose,
  children
}) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="sheet-backdrop" onClick={onClose} />

      {/* Sheet */}
      <div className="sheet">
        <div className="sheet-header">
          <h3>{title}</h3>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="sheet-body">
          {items ? (
            <>
              {items.length === 0 && (
                <p className="muted">No players available</p>
              )}

              {items.map(player => {
                const disabled = disabledItems.includes(player);

                return (
                  <button
                    key={player}
                    className={`sheet-item ${disabled ? "disabled" : ""}`}
                    disabled={disabled}
                    onClick={() => onSelect(player)}
                  >
                    {player}
                  </button>
                );
              })}
            </>
          ) : (
            // Render custom children if items is not provided
            <>
              {React.Children.map(children, child => child)}
            </>
          )}
        </div>
      </div>
    </>
  );
}
