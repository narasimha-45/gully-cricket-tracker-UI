export const renderBatStats = (innings, name) => {
  const s = innings.battingStats[name] || {};
  return (
    <>
      <span>{s.runs || 0}</span>
      <span>{s.balls || 0}</span>
      <span>{s.fours || 0}</span>
      <span>{s.sixes || 0}</span>
    </>
  );
};

export const renderBowlStats = (innings, name) => {
  const s = innings.bowlingStats[name] || {};
  return (
    <>
      <span>{`${Math.floor((s.balls || 0) / 6)}.${(s.balls || 0) % 6}`}</span>
      <span>{s.maidens || 0}</span>
      <span>{s.runs || 0}</span>
      <span>{s.wickets || 0}</span>
    </>
  );
};
