import { Outlet, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import styles from "../pages/Home.module.css";

export default function SeasonShell() {
  const navigate = useNavigate();
  const { seasonId } = useParams();

  return (
    <AppShell
      title="Gully Cricket"
      bottomAction={
        <button
          className={styles.createBtn}
          onClick={() => navigate(`/season/${seasonId}/create-match`)}
        >
          + Create Match
        </button>
      }
    >
      <Outlet />
    </AppShell>
  );
}
