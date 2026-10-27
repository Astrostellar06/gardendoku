/**
 * Online side of the game. Picks the backend: Supabase when the build is
 * configured (VITE_SUPABASE_URL and VITE_SUPABASE_KEY in .env, see the README), the
 * demo with `?ligue=demo`, none otherwise (the league stays hidden). Gardens
 * solved offline wait in a queue (localStorage) until the server has them.
 */
import type { League, PlayerRow, Profile, Scored, SocialBackend, SolveKind, WeekResult } from './backend';

const QUEUE_KEY = 'gardendoku:social-queue';
const DEMO_KEY = 'gardendoku:social-demo';

interface Pending {
  kind: SolveKind;
  ref: number;
}

/** Server refusals that will never change: such a solve is dropped from the queue. */
const PERMANENT = ['level_locked', 'daily_closed', 'bad_kind'];

const MESSAGES: Record<string, string> = {
  name_length: 'Ton pseudo doit faire de 3 à 16 caractères.',
  name_chars: "Lettres, chiffres, espaces et - _ ' . seulement.",
  name_banned: "Ce pseudo n'est pas autorisé : choisis-en un autre.",
  bad_avatar: 'Choisis un des avatars.',
  friend_unknown: "Aucun jardinier n'a ce code.",
  friend_self: "C'est ton propre code !",
  friend_limit: 'Tu as déjà 100 amis.',
};

/** French text for a failure (server code, or no network). */
export function socialErrorText(e: unknown): string {
  const code = e instanceof Error ? e.message : '';
  if (MESSAGES[code]) return MESSAGES[code];
  if (/anonymous/i.test(code)) return "Le serveur n'accepte pas encore les comptes anonymes.";
  return 'Pas de connexion pour le moment : réessaie un peu plus tard.';
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

  /** A garden was solved: scored now if possible, later otherwise (null then). */
  async recordSolve(kind: SolveKind, ref: number, level: number): Promise<Scored | null> {
    if (!this.enabled) return null;
    this.syncLevel(level);
    this.queue.push({ kind, ref });
    writeStorage(QUEUE_KEY, JSON.stringify(this.queue));
    const scored = await this.flush();
    return scored.get(`${kind}:${ref}`) ?? null;
  }

  /** Send the level and the waiting solves, in order; stops at the first network failure. */
  flush(): Promise<Map<string, Scored>> {
    const run = this.chain.then(async () => {
      const scored = new Map<string, Scored>();
      const b = await this.ready();
      if (!b) return scored;
      try {
        if (this.profile && this.level > this.profile.level) {
          await b.syncLevel(this.level);
          this.profile.level = this.level;
        }
        while (this.queue.length) {
          const { kind, ref } = this.queue[0];
          try {
            scored.set(`${kind}:${ref}`, await b.submitSolve(kind, ref));
          } catch (e) {
            if (!(e instanceof Error) || !PERMANENT.includes(e.message)) throw e;
          }
          this.queue.shift();
          writeStorage(QUEUE_KEY, JSON.stringify(this.queue));
        }
      } catch {
        // Offline: what is left goes with the next flush.
      }
      return scored;
    });
    this.chain = run;
    return run;
  }

  /** Signed-in backend, or a failure with a French message. */
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
