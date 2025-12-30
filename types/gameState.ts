import { Team } from "./team";

export interface GameState {
  _id: string;
  gameId: string;
  teams: Team[];
  currentTeamIndex: number;
  currentRoundIndex: number;
  completedQuestionIds: string[];
}