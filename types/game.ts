import { Team } from "./team";
import { Theme } from "./theme";

export interface Game {
  _id: string;
  roundIds: string[];
  name: string;
  theme: Theme;
}
