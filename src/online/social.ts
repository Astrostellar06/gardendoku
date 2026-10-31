/**
 * Online side of the game. Picks the backend: Supabase when the build is
 * configured (VITE_SUPABASE_URL and VITE_SUPABASE_KEY in .env, see the README), the
 * demo with `?ligue=demo`, none otherwise (the league stays hidden). Gardens
 * solved offline wait in a queue (localStorage) until the server has them.
 */
import { type Key, t } from '../i18n';
import type { League, PlayerRow, Profile, Scored, SocialBackend, SolveKind, SolveTime, TimeRank, WeekResult } from './backend';

const QUEUE_KEY = 'gardendoku:social-queue';
const DEMO_KEY = 'gardendoku:social-demo';

interface Pending {
  kind: SolveKind;
  ref: number;
  /** The solve's time, to collect real players' times (older queues have none). */
  time?: SolveTime;
}

/** What the server made of a solve: points for the league, and the time's rank. */
export interface SolveResult {
  scored: Scored | null;
  rank: TimeRank | null;
}

/** Server refusals that will never change: such a solve is dropped from the queue. */
const PERMANENT = ['level_locked', 'daily_closed', 'bad_kind', 'bad_time'];

/** Server error codes and the text shown for each. */
const MESSAGES: Record<string, Key> = {
  name_length: 'error.nameLength',
  name_chars: 'error.nameChars',
  name_banned: 'error.nameBanned',
  bad_avatar: 'error.badAvatar',
  friend_unknown: 'error.friendUnknown',
  friend_self: 'error.friendSelf',
  friend_limit: 'error.friendLimit',
};

/** Text for a failure (server code, or no network), in the current language. */
export function socialErrorText(e: unknown): string {
  const code = e instanceof Error ? e.message : '';
  if (MESSAGES[code]) return t(MESSAGES[code]);
  if (/anonymous/i.test(code)) return t('error.anonymous');
  return t('error.offline');
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the queue only lives in memory then.
  }
}

export class Social {
  /** False without a server (nor demo): the league stays hidden. */
  readonly enabled: boolean;
  readonly demo: boolean;
  profile: Profile | null = null;
  private backend: Promise<SocialBackend> | null;
  private session: Promise<SocialBackend | null> | null = null;
  private queue: Pending[];
  /** Highest level unlocked, to send with the next flush. */
  private level = 0;
  /** Flushes run one after the other. */
  private chain: Promise<unknown> = Promise.resolve();

  constructor() {
    const asked = new URLSearchParams(location.search).get('ligue');
    if (asked === 'demo') writeStorage(DEMO_KEY, '1');
    if (asked === 'off') writeStorage(DEMO_KEY, null);
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined;
    this.demo = readStorage(DEMO_KEY) === '1';
    if (this.demo) this.backend = import('./demo').then((m) => m.demoBackend());
    else if (url && key) this.backend = import('./supabase').then((m) => m.supabaseBackend(url, key));
    else this.backend = null;
    this.enabled = this.backend !== null;
    try {
      this.queue = JSON.parse(readStorage(QUEUE_KEY) ?? '[]');
    } catch {
      this.queue = [];
    }
  }

  /** Signed in with a profile, or null (offline, or no server). Retries on the next call after a failure. */
  private ready(): Promise<SocialBackend | null> {
    if (!this.backend) return Promise.resolve(null);
    this.session ??= this.backend
      .then(async (b) => {
        this.profile = await b.connect();
        return b;
      })
      .catch(() => {
        this.session = null;
        return null;
      });
    return this.session;
  }

  /** Sign in and send what was waiting. */
  async connect(): Promise<Profile | null> {
    await this.flush();
    return this.profile;
  }

  /** Highest level unlocked (sent with the next flush). */
  syncLevel(level: number) {
    this.level = Math.max(this.level, level);
  }

  /** A garden was solved: scored (and its time compared) now if possible, later otherwise (null then). */
  async recordSolve(kind: SolveKind, ref: number, level: number, time?: SolveTime): Promise<SolveResult | null> {
    if (!this.enabled) return null;
    this.syncLevel(level);
    this.queue.push({ kind, ref, time });
    writeStorage(QUEUE_KEY, JSON.stringify(this.queue));
    const results = await this.flush();
    return results.get(`${kind}:${ref}`) ?? null;
  }

  /** Send the level and the waiting solves, in order; stops at the first network failure. */
  flush(): Promise<Map<string, SolveResult>> {
    const run = this.chain.then(async () => {
      const results = new Map<string, SolveResult>();
      const b = await this.ready();
      if (!b) return results;
      try {
        if (this.profile && this.level > this.profile.level) {
          await b.syncLevel(this.level);
          this.profile.level = this.level;
        }
        while (this.queue.length) {
          const { kind, ref, time } = this.queue[0];
          const result: SolveResult = { scored: null, rank: null };
          try {
            result.scored = await b.submitSolve(kind, ref);
          } catch (e) {
            if (!(e instanceof Error) || !PERMANENT.includes(e.message)) throw e;
          }
          if (time) {
            // Scoring again after a failure here is harmless: a garden only counts once.
            try {
              result.rank = await b.recordTime(kind, ref, time);
            } catch (e) {
              if (!(e instanceof Error) || !PERMANENT.includes(e.message)) throw e;
            }
          }
          results.set(`${kind}:${ref}`, result);
          this.queue.shift();
          writeStorage(QUEUE_KEY, JSON.stringify(this.queue));
        }
      } catch {
        // Offline: what is left goes with the next flush.
      }
      return results;
    });
    this.chain = run;
    return run;
  }

  /** Signed-in backend, or a failure (shown with socialErrorText). */
  private async need(): Promise<SocialBackend> {
    const b = await this.ready();
    if (!b) throw new Error('offline');
    return b;
  }

  async league(): Promise<League> {
    await this.flush();
    return (await this.need()).league();
  }

  async friends(): Promise<PlayerRow[]> {
    await this.flush();
    return (await this.need()).friends();
  }

  async addFriend(code: string): Promise<PlayerRow> {
    return (await this.need()).addFriend(code);
  }

  async removeFriend(id: string): Promise<void> {
    return (await this.need()).removeFriend(id);
  }

  async setProfile(name: string, avatar: number): Promise<Profile> {
    this.profile = await (await this.need()).setProfile(name, avatar);
    return this.profile;
  }

  /** Finished weeks and their prizes, each handed out once; [] when offline. */
  async claimRewards(): Promise<WeekResult[]> {
    const b = await this.ready();
    if (!b) return [];
    try {
      return await b.claimRewards();
    } catch {
      return [];
    }
  }
}
