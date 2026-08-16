import { useContext } from "react";
import { MatchSessionContext } from "./matchSessionContext";

export function useMatchSession() {
  const context = useContext(MatchSessionContext);
  if (!context) {
    throw new Error("useMatchSession must be used inside MatchSessionProvider");
  }
  return context;
}
