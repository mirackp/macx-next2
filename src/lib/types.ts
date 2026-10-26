export type Settings = {
  siteName: string;
  title: string;
  description: string;
  siteUrl: string;
  indexable: boolean;
  googleVerification: string;
  gaId: string;
  adsenseId: string;
  adSlot: string;
  adImage: string;
  adUrl: string;
  adLabel: string;
  predictionsIntro: string;
  youtubeUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  xUrl: string;
};
export type Prediction = {
  id: string;
  home: string;
  away: string;
  league: string;
  date: string;
  pick: string;
  odds: string;
  analysis: string;
  status: "draft" | "published";
  result: "pending" | "won" | "lost" | "void";
  updatedAt: number;
};
export type Team = {
  id: string;
  name: string;
  logo: string;
  score: string;
  record: string;
  form: string;
};
export type Match = {
  id: string;
  slug: string;
  league: string;
  date: string;
  time: string;
  kickoff: string;
  state: "pre" | "live" | "final" | "off";
  status: string;
  clock: string;
  score: string;
  place: string;
  home: Team;
  away: Team;
  channels: string[];
};
export type Feed = {
  date: string;
  matches: Match[];
  fetchedAt: number;
  stale: boolean;
  errors: string[];
  retryAt?: number;
};
export type Detail = {
  id: string;
  fetchedAt: number;
  stats: { label: string; home: string; away: string }[];
  lineups: {
    name: string;
    formation: string;
    players: {
      name: string;
      number: string;
      position: string;
      starter: boolean;
    }[];
  }[];
  events: { minute: string; text: string; type: string }[];
  officials: string[];
  lastGames: {
    name: string;
    rows: { date: string; opponent: string; score: string; result: string }[];
  }[];
};
export type Odds = {
  home: string;
  away: string;
  time: string;
  date: string;
  one: string;
  draw: string;
  two: string;
  over: string;
  under: string;
  source: string;
};
