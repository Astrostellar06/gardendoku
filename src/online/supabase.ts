/**
 * Online services on Supabase: anonymous sign-in, then the functions of
 * supabase/migrations (the tables themselves are closed to the app).
 * Loaded on demand, only when a project is configured.
 */
import { createClient } from '@supabase/supabase-js';
import type { League, PlayerRow, Profile, Scored, SocialBackend, WeekResult } from './backend';

interface ProfileJson {
  id: string;
  name: string;
  avatar: number;
  level: number;
  friend_code: string;
}

const toProfile = (p: ProfileJson): Profile => ({ id: p.id, name: p.name, avatar: p.avatar, level: p.level, friendCode: p.friend_code });

export function supabaseBackend(url: string, key: string): SocialBackend {
  const client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'gardendoku:auth' },
  });

  async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as T;
  }

  return {
    async connect() {
      const { data } = await client.auth.getSession();
      if (!data.session) {
        const { error } = await client.auth.signInAnonymously();
        if (error) throw new Error(error.message);
      }
      return toProfile(await rpc<ProfileJson>('ensure_profile'));
    },
    async setProfile(name, avatar) {
      return toProfile(await rpc<ProfileJson>('set_profile', { p_name: name, p_avatar: avatar }));
    },
    async syncLevel(level) {
      await rpc('sync_level', { p_level: level });
    },
    async submitSolve(kind, ref) {
      const r = await rpc<{ points: number; week_points: number }>('submit_solve', { p_kind: kind, p_ref: ref });
      return { points: r.points, weekPoints: r.week_points } satisfies Scored;
    },
    async league() {
      const r = await rpc<{ week_end: string; members: PlayerRow[] }>('get_league');
      return { weekEnd: new Date(r.week_end), members: r.members } satisfies League;
    },
    async friends() {
      return rpc<PlayerRow[]>('get_friends');
    },
    async addFriend(code) {
      const f = await rpc<Omit<PlayerRow, 'me' | 'points'>>('add_friend', { p_code: code });
      return { ...f, me: false, points: 0 };
    },
    async removeFriend(id) {
      await rpc('remove_friend', { p_id: id });
    },
    async claimRewards() {
      return rpc<WeekResult[]>('claim_rewards');
    },
  };
}
