import { Outlet, useNavigate, useParams, useLocation } from "react-router-dom";
import AppShell from "../components/AppShell";
import styles from "../pages/Home.module.css";

export default function SeasonShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { seasonId } = useParams();

  const isStatsPage = location.pathname.includes("/stats");

  return (
    <AppShell
      title="Gully Cricket"
      bottomAction={
        !isStatsPage && (
          <button
            className={styles.createBtn}
            onClick={() => navigate(`/season/${seasonId}/create-match`)}
          >
            + Create Match
          </button>
        )
      }
    >
      <Outlet />
    </AppShell>
  );
}
