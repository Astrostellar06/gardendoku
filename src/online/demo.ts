/**
 * Made-up league and friends, to try the screens without a server
 * (`?ligue=demo` in the address; `?ligue=off` to leave). The other players'
 * points grow along the week; the player's own state lives in localStorage.
 */
import { levelInfo } from '../core/levels';
import { hashString, Rng } from '../core/rng';
import type { League, PlayerRow, Profile, SocialBackend, WeekResult } from './backend';
import { DAILY_POINTS, LEAGUE_PRIZES, LEAGUE_SIZE, levelPoints } from './points';

const KEY = 'gardendoku:demo-social';
const NAMES = [
  'Lavande', 'Basilic', 'Capucine', 'Pivoine', 'Mimosa', 'Romarin', 'Hortense', 'Camomille', 'Jonquille', 'Sauge', 'Myrtille',
  'Églantine', 'Coquelicot', 'Glycine', 'Bambou', 'Jasmin', 'Marjolaine', 'Iris', 'Lilas', 'Tilleul', 'Verveine', 'Pâquerette',
];
const FRIENDS = ['Margot', 'Théo', 'Inès'];

interface DemoState {
  name: string;
  avatar: number;
  level: number;
  week: string;
  points: number;
  solved: string[];
  friends: string[];
  resultSeen: boolean;
}

/** Monday of this week, local time. */
function weekStart(now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function load(): DemoState {
  const week = weekStart().toDateString();
  let s: DemoState | null = null;
  try {
    s = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    s = null;
  }
  s ??= { name: '', avatar: 0, level: 1, week, points: 0, solved: [], friends: [...FRIENDS], resultSeen: false };
  if (s.week !== week) Object.assign(s, { week, points: 0, solved: [] });
  return s;
}

function save(s: DemoState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private browsing: the demo simply forgets.
  }
}

/** A made-up player: stable for the week, their points growing as it goes by. */
function bot(seed: string, maxPoints: number, name = NAMES[hashString(seed) % NAMES.length]): PlayerRow {
  const rng = new Rng(seed);
  const elapsed = (Date.now() - weekStart().getTime()) / (7 * 24 * 3600 * 1000);
  return {
    id: seed,
    me: false,
    name,
    avatar: rng.int(12),
    level: 5 + rng.int(140),
    points: Math.round(maxPoints * rng.float(0.15, 1) * Math.min(1, 0.2 + elapsed)),
  };
}

const wait = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 250));

export function demoBackend(): SocialBackend {
  const s = load();
  const profile = (): Profile => ({ id: 'moi', name: s.name, avatar: s.avatar, level: s.level, friendCode: 'DEMO42' });
  const me = (): PlayerRow => ({ me: true, name: s.name, avatar: s.avatar, level: s.level, points: s.points });
  const byPoints = (a: PlayerRow, b: PlayerRow) => b.points - a.points;

  return {
    connect: () => wait(profile()),
    async setProfile(name, avatar) {
      const clean = name.trim().replace(/\s+/g, ' ');
      if (clean.length < 3 || clean.length > 16) throw new Error('name_length');
      Object.assign(s, { name: clean, avatar });
      save(s);
      return wait(profile());
    },
    async syncLevel(level) {
      s.level = Math.max(s.level, level);
      save(s);
    },
    async submitSolve(kind, ref) {
      const key = `${kind}:${ref}`;
      let points = 0;
      if (!s.solved.includes(key)) {
        s.solved.push(key);
        points = kind === 'daily' ? DAILY_POINTS : levelPoints(levelInfo(ref));
        s.points += points;
        if (kind === 'level') s.level = Math.max(s.level, ref + 1);
        save(s);
      }
      return wait({ points, weekPoints: s.points });
    },
    async league() {
      const end = weekStart();
      end.setDate(end.getDate() + 7);
      // Each made-up player of the league with a name of their own.
      const shift = hashString(s.week);
      const bots = Array.from({ length: LEAGUE_SIZE - 1 }, (_, k) => bot(`${s.week}:${k}`, 48, NAMES[(shift + k) % NAMES.length]));
      const members = s.solved.length === 0 ? [] : [me(), ...bots].sort(byPoints);
      return wait<League>({ weekEnd: end, members });
    },
    async friends() {
      // The first friends are called by their names; the ones added go by their code.
      const friend = (code: string) => bot(`ami:${code}`, 30, FRIENDS.includes(code) ? code : undefined);
      return wait([me(), ...s.friends.map(friend)].sort(byPoints));
    },
    async addFriend(code) {
      const clean = code.trim().toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(clean)) throw new Error('friend_unknown');
      if (clean === 'DEMO42') throw new Error('friend_self');
      if (!s.friends.includes(clean)) s.friends.push(clean);
      save(s);
      return wait(bot(`ami:${clean}`, 30));
    },
    async removeFriend(id) {
      s.friends = s.friends.filter((code) => `ami:${code}` !== id);
      save(s);
    },
    async claimRewards() {
      // The demo shows how a week ends once: second of the league.
      if (s.resultSeen) return wait<WeekResult[]>([]);
      s.resultSeen = true;
      save(s);
      const last = weekStart();
      last.setDate(last.getDate() - 7);
      return wait([{ week: last.toISOString().slice(0, 10), rank: 2, size: LEAGUE_SIZE, points: 41, ...LEAGUE_PRIZES[1] }]);
    },
  };
}
