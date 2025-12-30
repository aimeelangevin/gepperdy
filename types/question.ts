export interface Question {
  _id: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  answer: string;
  isDailyDouble: boolean;
  points: number;
}
