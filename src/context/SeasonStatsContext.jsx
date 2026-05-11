import { createContext, useContext, useState } from "react";

const SeasonStatsContext = createContext();

export function SeasonStatsProvider({ children }) {
  const [battingStats, setBattingStats] = useState(null);
  const [bowlingStats, setBowlingStats] = useState(null);
  const [miscStats, setMiscStats] = useState(null);

  return (
    <SeasonStatsContext.Provider
      value={{
        battingStats,
        setBattingStats,

        bowlingStats,
        setBowlingStats,

        miscStats,
        setMiscStats,
      }}
    >
      {children}
    </SeasonStatsContext.Provider>
  );
}

export function useSeasonStats() {
  return useContext(SeasonStatsContext);
}
