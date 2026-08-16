// Stable domain facade. Reducers/components import from this module while the
// implementation stays split by responsibility for easier ownership/testing.
export { scoreRun, takeWicket } from "./scoringEngine";
export {
  addTeamPlayer,
  changeBowler,
  declareTestInnings,
  finishTestAsDraw,
  removeTeamPlayer,
  retireBatter,
  selectPlayer,
  startNextInnings,
  startSuperOver,
  switchStrike,
  updateMatchSettings,
} from "./matchCommands";
export { undo } from "./undoEngine";
export { evaluateMatchState } from "./matchResolution";
