/**
 * What the game needs from the online services (weekly leagues, friends,
 * profile). Two implementations: Supabase (supabase.ts) and a demo with
 * made-up players (demo.ts), to try the screens without a server.
 *
 * Failures are thrown as Error whose message is a short code from the server
 * ('name_banned', 'friend_unknown'...), turned into French by social.ts.
 */

export interface Profile {
  id: string;
  /** Empty until the player picks one. */
  name: string;
  avatar: number;
  /** Highest level unlocked. */
  level: number;
  friendCode: string;
}

/** A row of a league or of the friends list. */
export interface PlayerRow {
  /** Friends list only: to remove a friend. */
  id?: string;
  me: boolean;
  name: string;
  avatar: number;
  level: number;
  /** Points of the week. */
  points: number;
}

export interface League {
  weekEnd: Date;
  /** Best first; empty until the player's first garden of the week. */
  members: PlayerRow[];
}

/** How a finished week went, and its prize. */
export interface WeekResult {
  week: string;
  rank: number;
  size: number;
  points: number;
  hints: number;
  zones: number;
}

export interface Scored {
  /** Points this garden earned (0 if it had already counted). */
  points: number;
  /** Points of the week so far. */
  weekPoints: number;
}

export type SolveKind = 'level' | 'daily';

/** How a garden was solved, collected to compare players' real times. */
export interface SolveTime {
  seconds: number;
  moves: number;
  hints: number;
  zones: number;
  /** Version of the level generator (the same number is another garden after a change). */
  generator: number;
}

/** How a time compares with the other players who solved the same garden. */
export interface TimeRank {
  /** How many others have a recorded time. */
  players: number;
  /** Share of them slower (1..99), or null while they are too few. */
  fasterThan: number | null;
}

export interface SocialBackend {
  /** Sign in (anonymously, the first time) and return the player's profile. */
  connect(): Promise<Profile>;
  setProfile(name: string, avatar: number): Promise<Profile>;
  syncLevel(level: number): Promise<void>;
  /** `ref`: level number, or day of the challenge as YYYYMMDD. */
  submitSolve(kind: SolveKind, ref: number): Promise<Scored>;
  /** Keep the time of a garden (the first solve counts) and compare it with the others'. */
  recordTime(kind: SolveKind, ref: number, time: SolveTime): Promise<TimeRank>;
  league(): Promise<League>;
  /** The player and their friends, most points first. */
  friends(): Promise<PlayerRow[]>;
  addFriend(code: string): Promise<PlayerRow>;
  removeFriend(id: string): Promise<void>;
  /** Weeks over since the last call, with their prizes (each week comes once). */
  claimRewards(): Promise<WeekResult[]>;
}
