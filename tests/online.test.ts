/**
 * The Supabase migrations, run on an embedded Postgres (PGlite) with a stand-in
 * for Supabase Auth: auth.uid() reads the same setting as on Supabase.
 */
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { levelInfo } from '../src/core/levels';
import { LEAGUE_PRIZES, LEAGUE_SIZE, levelPoints } from '../src/online/points';

const AUTH_STUB = `
  create role anon;
  create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid());
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
`;

const MIGRATIONS = 'supabase/migrations';

let db: PGlite;

async function newPlayer(): Promise<string> {
  const res = await db.query<{ id: string }>('insert into auth.users default values returning id');
  const id = res.rows[0].id;
  await call(id, 'ensure_profile');
  return id;
}

/** Call a public function as a player. */
async function call<T = unknown>(player: string, fn: string, ...args: unknown[]): Promise<T> {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [player]);
  const params = args.map((_, k) => `$${k + 1}`).join(', ');
  const res = await db.query<{ r: T }>(`select public.${fn}(${params}) as r`, args);
  return res.rows[0].r;
}

/** The message of the exception raised by a call. */
async function failure(player: string, fn: string, ...args: unknown[]): Promise<string> {
  try {
    await call(player, fn, ...args);
  } catch (e) {
    return (e as Error).message;
  }
  return 'no error';
}

/** The week is over: move every league back one week. */
async function endWeek() {
  await db.exec(`
    update leagues set week = week - 7;
    update league_members set week = week - 7;
    update solves set week = week - 7;
  `);
}

async function today(): Promise<number> {
  const res = await db.query<{ d: number }>(`select to_char((now() at time zone 'Europe/Paris')::date, 'YYYYMMDD')::int as d`);
  return res.rows[0].d;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(AUTH_STUB);
  for (const file of readdirSync(MIGRATIONS).sort()) await db.exec(readFileSync(`${MIGRATIONS}/${file}`, 'utf8'));
}, 60_000);

describe('online: profiles', () => {
  it('creates one profile per player, with a six-character friend code', async () => {
    const p = await newPlayer();
    const a = await call<{ friend_code: string; level: number; name: string }>(p, 'ensure_profile');
    const b = await call<{ friend_code: string }>(p, 'ensure_profile');
    expect(a.friend_code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(b.friend_code).toBe(a.friend_code);
    expect([a.level, a.name]).toEqual([1, '']);
  });

  it('checks names: length, characters and rude words, accents and look-alike digits included', async () => {
    const p = await newPlayer();
    expect(await failure(p, 'set_profile', 'Al', 0)).toBe('name_length');
    expect(await failure(p, 'set_profile', 'Un nom bien trop long', 0)).toBe('name_length');
    expect(await failure(p, 'set_profile', 'Bob<b>', 0)).toBe('name_chars');
    for (const rude of ['Connard', 'C0NNARD', 'gros con', 'Pute du 13', 'Fuck', 'Admin']) {
      expect(await failure(p, 'set_profile', rude, 0), rude).toBe('name_banned');
    }
    for (const fine of ['Constance', 'Canal joyeux', 'Sébastien', "Zoé l'Abeille", 'Culture-21', 'Réputée']) {
      expect((await call<{ name: string }>(p, 'set_profile', fine, 3)).name, fine).toBe(fine);
    }
    expect(await failure(p, 'set_profile', 'Margot', 12)).toBe('bad_avatar');
    expect((await call<{ name: string }>(p, 'set_profile', '  Jardin   Zen ', 5)).name).toBe('Jardin Zen');
  });
});

describe('online: scoring', () => {
  it('scores each level once, from the server table, and only levels the player has reached', async () => {
    const p = await newPlayer();
    expect(await call(p, 'submit_solve', 'level', 1)).toEqual({ points: 1, week_points: 1 });
    expect(await call(p, 'submit_solve', 'level', 1)).toEqual({ points: 0, week_points: 1 });
    expect(await failure(p, 'submit_solve', 'level', 9)).toBe('level_locked');
    await call(p, 'sync_level', 10);
    // Level 3 is hexagonal (2 points), level 5 has joined edges (4).
    expect(await call(p, 'submit_solve', 'level', 3)).toEqual({ points: 2, week_points: 3 });
    expect(await call(p, 'submit_solve', 'level', 5)).toEqual({ points: 4, week_points: 7 });
    expect(await failure(p, 'submit_solve', 'other', 5)).toBe('bad_kind');
  });

  it('gives the points of the game itself (generated table)', async () => {
    const res = await db.query<{ level: number; points: number }>('select level, points from level_points where level <= 300 order by level');
    expect(res.rows).toHaveLength(300);
    for (const { level, points } of res.rows) expect(points, `level ${level}`).toBe(levelPoints(levelInfo(level)));
  });

  it("scores today's challenge once, and refuses an old one", async () => {
    const p = await newPlayer();
    const day = await today();
    expect(await call(p, 'submit_solve', 'daily', day)).toEqual({ points: 3, week_points: 3 });
    expect(await call(p, 'submit_solve', 'daily', day)).toEqual({ points: 0, week_points: 3 });
    expect(await failure(p, 'submit_solve', 'daily', 20200101)).toBe('daily_closed');
  });

  it('does not cap the points of a day', async () => {
    const p = await newPlayer();
    await call(p, 'sync_level', 200);
    let week = 0;
    for (let n = 1; n <= 100; n++) week = (await call<{ week_points: number }>(p, 'submit_solve', 'level', n)).week_points;
    let expected = 0;
    for (let n = 1; n <= 100; n++) expected += levelPoints(levelInfo(n));
    expect(week).toBe(expected);
  });
});

describe('online: leagues', () => {
  it(`groups the players of the week by ${LEAGUE_SIZE}, as they play their first garden`, async () => {
    await db.exec('truncate leagues cascade');
    const players: string[] = [];
    for (let k = 0; k < LEAGUE_SIZE * 2 + 5; k++) {
      const p = await newPlayer();
      players.push(p);
      await call(p, 'sync_level', 10);
      // Player k solves k % 4 + 1 levels.
      for (let n = 1; n <= (k % 4) + 1; n++) await call(p, 'submit_solve', 'level', n);
    }
    const sizes = await db.query<{ size: number }>('select size from leagues order by id');
    expect(sizes.rows.map((r) => r.size)).toEqual([LEAGUE_SIZE, LEAGUE_SIZE, 5]);

    const league = await call<{ week_end: string; members: Array<{ rank: number; me: boolean; points: number }> }>(players[0], 'get_league');
    expect(league.members).toHaveLength(LEAGUE_SIZE);
    expect(league.members.map((m) => m.rank)).toEqual(Array.from({ length: LEAGUE_SIZE }, (_, k) => k + 1));
    const points = league.members.map((m) => m.points);
    expect([...points].sort((a, b) => b - a)).toEqual(points);
    expect(league.members.filter((m) => m.me)).toHaveLength(1);
    // The week ends on a Monday at midnight, Paris time.
    const end = new Date(league.week_end);
    expect(end.getTime()).toBeGreaterThan(Date.now());
    expect(end.getTime() - Date.now()).toBeLessThanOrEqual(7 * 24 * 3600 * 1000);

    // Not in a league before the first garden of the week.
    const newcomer = await newPlayer();
    expect((await call<{ members: unknown[] }>(newcomer, 'get_league')).members).toEqual([]);
  });

  it('hands out the prizes of the five best once the week is over, once', async () => {
    await db.exec('truncate leagues cascade');
    // Levels worth one point each.
    const single = [1, 2, 4, 7, 8, 9];
    const players: string[] = [];
    for (let k = 0; k < 6; k++) {
      const p = await newPlayer();
      players.push(p);
      await call(p, 'sync_level', 20);
      // Player k scores 6 - k points.
      for (const n of single.slice(0, 6 - k)) await call(p, 'submit_solve', 'level', n);
    }
    // A seventh player is in the league without a single point: no prize.
    const late = await newPlayer();
    players.push(late);
    await call(late, 'submit_solve', 'level', 1);
    await db.query('update league_members set points = 0 where player = $1', [late]);
    expect(await call(players[0], 'claim_rewards')).toEqual([]);

    await endWeek();
    for (let k = 0; k < 7; k++) {
      const [reward] = await call<Array<{ rank: number; size: number; hints: number; zones: number }>>(players[k], 'claim_rewards');
      expect(reward.rank, `player ${k}`).toBe(k + 1);
      expect(reward.size).toBe(7);
      const prize = LEAGUE_PRIZES[k] ?? { zones: 0, hints: 0 };
      expect({ zones: reward.zones, hints: reward.hints }, `player ${k}`).toEqual(prize);
      expect(await call(players[k], 'claim_rewards')).toEqual([]);
    }
    // A new week, a new league.
    expect((await call<{ members: unknown[] }>(players[0], 'get_league')).members).toEqual([]);
  });
});

describe('online: friends', () => {
  it('links two players with a code, both ways, with their points of the week', async () => {
    const [a, b] = [await newPlayer(), await newPlayer()];
    await call(a, 'set_profile', 'Anémone', 1);
    await call(b, 'set_profile', 'Basilic', 2);
    const codeB = (await call<{ friend_code: string }>(b, 'ensure_profile')).friend_code;
    expect(await failure(a, 'add_friend', 'ZZZZZZ')).toBe('friend_unknown');
    expect(await failure(b, 'add_friend', codeB)).toBe('friend_self');
    expect((await call<{ name: string }>(a, 'add_friend', ` ${codeB.toLowerCase()} `)).name).toBe('Basilic');
    await call(a, 'add_friend', codeB);

    await call(b, 'submit_solve', 'level', 1);
    const seenByA = await call<Array<{ name: string; me: boolean; points: number; level: number }>>(a, 'get_friends');
    expect(seenByA.map((f) => [f.name, f.me, f.points, f.level])).toEqual([
      ['Basilic', false, 1, 2],
      ['Anémone', true, 0, 1],
    ]);
    expect((await call<unknown[]>(b, 'get_friends')).length).toBe(2);

    const idB = seenByA[0] as unknown as { id: string };
    await call(a, 'remove_friend', idB.id);
    expect((await call<unknown[]>(b, 'get_friends')).length).toBe(1);
  });
});

describe('online: access', () => {
  it('keeps the tables and helpers closed to the app, and the functions open', async () => {
    const p = await newPlayer();
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [p]);
    await db.exec('set role authenticated');
    try {
      await expect(db.query('select * from public.profiles')).rejects.toThrow(/permission denied/);
      await expect(db.query(`select public.join_league('${p}', current_date)`)).rejects.toThrow(/permission denied/);
      const res = await db.query<{ r: { friend_code: string } }>('select public.ensure_profile() as r');
      expect(res.rows[0].r.friend_code).toHaveLength(6);
    } finally {
      await db.exec('reset role');
    }
  });

  it('refuses players who are not signed in', async () => {
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    await expect(db.query('select public.get_league()')).rejects.toThrow(/not_signed_in/);
  });
});
