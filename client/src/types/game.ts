export type GameService = 'steam' | 'rawg' | 'f95' | 'epic';
export type GameStatus = 'Completed' | 'Uncompleted' | 'Played' | 'WantPlay';

export type Game = {
  id: string;
  title: string;
  description: string;
  version: string;
  source: {
    service: GameService;
    id: number | string;
  } | null;
  status: GameStatus;
  folder: string;
  online: boolean;
  sourceVersion?: string;
};
