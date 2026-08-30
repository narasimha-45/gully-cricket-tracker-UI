import styles from "./MatchTypeTabs.module.css";

export const MATCH_TYPE_OPTIONS = [
  { value: "OVERS", label: "Limited Overs" },
  { value: "TEST", label: "Test" },
];

export default function MatchTypeTabs({ value, onChange }) {
  return (
    <nav className={styles.tabs} aria-label="Match type">
      {MATCH_TYPE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? styles.activeTab : styles.tab}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </nav>
  );
}
