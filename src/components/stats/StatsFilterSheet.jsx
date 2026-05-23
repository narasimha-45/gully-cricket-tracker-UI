import { useEffect } from "react";

import {
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

export default function StatsFilterSheet({
  open,
  onClose,
  filters,
  selectedFilters,
  onChange,
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  if (!open) return null;

  const handleSelect = (key, value) => {
    onChange((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    const reset = {};

    filters.forEach((f) => {
      reset[f.key] = "All";
    });

    onChange(reset);
  };

  return (
    <div style={backdrop} onClick={onClose}>
      <div
        style={sheet}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={handle} />

        {/* Header */}
        <div style={header}>
          <div style={headerLeft}>
            <SlidersHorizontal size={22} />

            <h2 style={title}>Filter</h2>
          </div>

          <button
            style={resetBtn}
            onClick={resetFilters}
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        {/* Filters */}
        <div style={filtersWrap}>
          {filters.map((filter) => (
            <div
              key={filter.key}
              style={filterRow}
            >
              <label style={label}>
                {filter.label}
              </label>

              <select
                value={
                  selectedFilters[filter.key]
                }
                onChange={(e) =>
                  handleSelect(
                    filter.key,
                    e.target.value
                  )
                }
                style={select}
              >
                {filter.options.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={footer}>
          <button
            style={applyBtn}
            onClick={onClose}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const backdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  backdropFilter: "blur(5px)",
  zIndex: 999,
  display: "flex",
  alignItems: "flex-end",
};

const sheet = {
  width: "100%",
  background: "#ffffff",
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
  padding: "10px 18px 18px",
  animation: "slideUp 0.25s ease",
};

const handle = {
  width: 64,
  height: 6,
  borderRadius: 999,
  background: "#d4d4d8",
  margin: "0 auto 18px",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
};

const headerLeft = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const title = {
  fontSize: 22,
  fontWeight: 800,
  color: "#111827",
};

const resetBtn = {
  border: "none",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: "#4338ca",
  fontWeight: 700,
  fontSize: 15,
};

const filtersWrap = {
  display: "flex",
  flexDirection: "column",
};

const filterRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "18px 0",
  borderBottom: "1px solid #f1f5f9",
};

const label = {
  fontSize: 16,
  fontWeight: 700,
  color: "#111827",
};

const select = {
  minWidth: 120,
  height: 42,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  padding: "0 14px",
  fontSize: 15,
  fontWeight: 700,
  color: "#4338ca",
  outline: "none",
};

const footer = {
  position: "sticky",
  bottom: 0,
  background: "#ffffff",
  paddingTop: 18,
};

const applyBtn = {
  width: "100%",
  height: 56,
  border: "none",
  borderRadius: 18,
  background:
    "linear-gradient(135deg,#4f46e5,#4338ca)",
  color: "#ffffff",
  fontSize: 18,
  fontWeight: 800,
  boxShadow:
    "0 10px 24px rgba(79,70,229,0.25)",
};