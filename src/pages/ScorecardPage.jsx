import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Scorecard from "../components/Scorecard";
import { getMatch } from "../storage/matchDB"; // indexedDB

export default function ScorecardPage() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const loadMatch = async () => {
      setLoading(true);

      // 1️⃣ Try IndexedDB first
      const localMatch = await getMatch(matchId);

      if (localMatch && localMatch.status !== "COMPLETED") {
        setMatch(localMatch);
        setLoading(false);
        return;
      }

      // 2️⃣ Otherwise fetch from backend
      const res = await fetch(`${API}/api/matches/${matchId}`);
      const data = await res.json();
      setMatch(data);
      setLoading(false);
    };

    loadMatch();
  }, [matchId]);

  if (loading) return <p>Loading scorecard…</p>;
  if (!match) return <p>Match not found</p>;

  return <Scorecard match={match} />;
}
