-- Gardendoku online: player profiles, weekly leagues of 20, friends.
--
-- Players sign in anonymously (Supabase Auth: "Allow anonymous sign-ins").
-- The tables are closed to the app (row level security on, no policy): it
-- only calls the functions at the end of this file, which identify the
-- caller with auth.uid() and compute points themselves from the level
-- number (table level_points, filled by the next migration).
--
-- A week runs from Monday 00:00 to Sunday 24:00, Paris time. A player joins
-- a league of the week with their first garden of the week (the oldest league
-- that still has room, or a new one). Once the week is over, claim_rewards
-- hands out the prizes of the five best of each league.

-- ---------- Tables ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Empty until the player picks a name.
  name text,
  avatar smallint not null default 0,
  -- Highest level unlocked, shown next to the name.
  level integer not null default 1,
  friend_code text not null unique,
  -- Points scored on points_day (Paris time), capped per day.
  points_day date,
  points_today integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.level_points (
  level integer primary key,
  points smallint not null
);

-- Each level, and each day's challenge, counts once per player.
create table public.solves (
  player uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('level', 'daily')),
  -- Level number, or day of the challenge as YYYYMMDD.
  ref integer not null,
  points smallint not null,
  week date not null,
  solved_at timestamptz not null default now(),
  primary key (player, kind, ref)
);

create table public.leagues (
  id bigint generated always as identity primary key,
  week date not null,
  size integer not null default 0
);
create index leagues_open on public.leagues (week, size);

create table public.league_members (
  week date not null,
  player uuid not null references public.profiles (id) on delete cascade,
  league bigint not null references public.leagues (id) on delete cascade,
  points integer not null default 0,
  -- When the points last went up: on a tie, the first one there ranks higher.
  reached_at timestamptz not null default now(),
  primary key (week, player)
);
create index league_members_league on public.league_members (league);

-- One row per pair of friends, the smaller id first.
create table public.friendships (
  a uuid not null references public.profiles (id) on delete cascade,
  b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
create index friendships_b on public.friendships (b);

create table public.rewards_claimed (
  player uuid not null references public.profiles (id) on delete cascade,
  week date not null,
  rank integer not null,
  hints integer not null,
  zones integer not null,
  claimed_at timestamptz not null default now(),
  primary key (player, week)
);

-- Words a name may not contain. `whole`: only as a word of its own (short
-- words hide inside harmless ones: "con" in "conifère", "cul" in "culture").
create table public.banned_words (
  word text primary key,
  whole boolean not null default true
);

insert into public.banned_words (word, whole) values
  ('connard', false), ('connasse', false), ('salope', false), ('salaud', false), ('encul', false),
  ('enfoir', false), ('putain', false), ('batard', false), ('pedophil', false), ('branleur', false),
  ('branlett', false), ('bougnoul', false), ('youpin', false), ('hitler', false), ('nazi', false),
  ('porno', false), ('nigger', false), ('nigga', false), ('faggot', false), ('fuck', false),
  ('shit', false), ('bitch', false), ('cunt', false), ('asshole', false), ('admin', false),
  ('moderat', false), ('gardendoku', false),
  ('con', true), ('conne', true), ('cons', true), ('pute', true), ('putes', true), ('pd', true),
  ('pede', true), ('fdp', true), ('ntm', true), ('nique', true), ('niquer', true), ('cul', true),
  ('bite', true), ('bites', true), ('couille', true), ('couilles', true), ('merde', true),
  ('chier', true), ('viol', true), ('violeur', true), ('pedo', true), ('chatte', true),
  ('zizi', true), ('tapette', true), ('gouine', true), ('negre', true), ('negro', true),
  ('sexe', true), ('sex', true), ('porn', true), ('cock', true), ('dick', true), ('dicks', true),
  ('fag', true), ('fags', true), ('slut', true), ('whore', true), ('rape', true), ('retard', true),
  ('penis', true), ('vagin', true), ('vagina', true), ('modo', true), ('staff', true);

alter table public.profiles enable row level security;
alter table public.level_points enable row level security;
alter table public.solves enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.friendships enable row level security;
alter table public.rewards_claimed enable row level security;
alter table public.banned_words enable row level security;

-- ---------- Helpers (not callable by the app) ----------

/** Monday of the week (Paris time) of a moment. */
create function public.week_of(t timestamptz) returns date
language sql stable as $$
  select date_trunc('week', t at time zone 'Europe/Paris')::date
$$;

/** Lower-case ASCII form of a name, accents and look-alike digits folded, for the word filter. */
create function public.name_key(p text) returns text
language sql immutable as $$
  select lower(translate(
    replace(replace(replace(replace(p, 'œ', 'oe'), 'Œ', 'oe'), 'æ', 'ae'), 'Æ', 'ae'),
    'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸ013457@$€',
    'aaaaaaceeeeiiiinooooouuuuyyaaaaaaceeeeiiiinooooouuuuyyoieastase'
  ))
$$;

create function public.name_is_banned(p text) returns boolean
language sql stable set search_path = public as $$
  with k as (select name_key(p) as key)
  select exists (
    select 1 from banned_words w, k
    where (not w.whole and position(w.word in regexp_replace(k.key, '[^a-z]', '', 'g')) > 0)
       or (w.whole and w.word in (select unnest(regexp_split_to_array(k.key, '[^a-z]+'))))
  )
$$;

create function public.profile_json(p public.profiles) returns json
language sql stable as $$
  select json_build_object(
    'id', p.id, 'name', coalesce(p.name, ''), 'avatar', p.avatar,
    'level', p.level, 'friend_code', p.friend_code
  )
$$;

/** The caller, who must be signed in and have a profile (ensure_profile). */
create function public.me() returns uuid
language plpgsql stable set search_path = public as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not_signed_in';
  end if;
  if not exists (select 1 from profiles where id = v_me) then
    raise exception 'no_profile';
  end if;
  return v_me;
end
$$;

/** League of the week of a player, joining one (the oldest with room, or a new one) if needed. */
create function public.join_league(p_player uuid, p_week date) returns bigint
language plpgsql set search_path = public as $$
declare
  v_league bigint;
begin
  select league into v_league from league_members where week = p_week and player = p_player;
  if found then
    return v_league;
  end if;
  select id into v_league from leagues
    where week = p_week and size < 20
    order by id limit 1
    for update skip locked;
  if not found then
    insert into leagues (week) values (p_week) returning id into v_league;
  end if;
  update leagues set size = size + 1 where id = v_league;
  insert into league_members (week, player, league) values (p_week, p_player, v_league);
  return v_league;
end
$$;

/** Members of a league, best first: rank, name, avatar, level, points (and `me`). */
create function public.league_rows(p_league bigint, p_me uuid) returns json
language sql stable set search_path = public as $$
  select coalesce(json_agg(r order by r.rank), '[]'::json) from (
    select
      row_number() over (order by m.points desc, m.reached_at, m.player) as rank,
      p.id = p_me as me,
      coalesce(p.name, '') as name,
      p.avatar,
      p.level,
      m.points
    from league_members m
    join profiles p on p.id = m.player
    where m.league = p_league
  ) r
$$;

-- ---------- Functions called by the app ----------

/** Create the caller's profile on first call (with a friend code), and return it. */
create function public.ensure_profile() returns json
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_profile profiles;
  v_code text;
begin
  if v_me is null then
    raise exception 'not_signed_in';
  end if;
  select * into v_profile from profiles where id = v_me;
  while not found loop
    -- Six characters, without the look-alikes 0/O and 1/I.
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
      into v_code from generate_series(1, 6);
    begin
      insert into profiles (id, friend_code) values (v_me, v_code) returning * into v_profile;
    exception when unique_violation then
      -- The code was taken (or the profile was just created by another call): look again.
      select * into v_profile from profiles where id = v_me;
    end;
  end loop;
  return profile_json(v_profile);
end
$$;

/** Name (3 to 16 letters, digits, spaces and - _ ' .) and avatar (0 to 11). */
create function public.set_profile(p_name text, p_avatar integer) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := me();
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_profile profiles;
begin
  if char_length(v_name) < 3 or char_length(v_name) > 16 then
    raise exception 'name_length';
  end if;
  if v_name !~ '^[A-Za-z0-9À-ÖØ-öø-ÿŒœ _''.-]+$' then
    raise exception 'name_chars';
  end if;
  if name_is_banned(v_name) then
    raise exception 'name_banned';
  end if;
  if p_avatar is null or p_avatar < 0 or p_avatar > 11 then
    raise exception 'bad_avatar';
  end if;
  update profiles set name = v_name, avatar = p_avatar where id = v_me returning * into v_profile;
  return profile_json(v_profile);
end
$$;

/** Highest level unlocked (levels passed with a video included), shown to the others. */
create function public.sync_level(p_level integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  update profiles set level = greatest(level, least(coalesce(p_level, 1), 100000)) where id = me();
end
$$;

/**
 * A garden was solved: a level (`ref` = its number) or the challenge of the
 * day (`ref` = YYYYMMDD). Scores it once, joins the league of the week if
 * needed, and returns the points earned and the points of the week.
 */
create function public.submit_solve(p_kind text, p_ref integer) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := me();
  v_now timestamptz := now();
  v_today date := (v_now at time zone 'Europe/Paris')::date;
  v_week date := week_of(v_now);
  v_profile profiles;
  v_today_points integer;
  v_points integer;
  v_total integer;
begin
  select * into v_profile from profiles where id = v_me for update;
  if p_kind = 'level' then
    if p_ref is null or p_ref < 1 or p_ref > v_profile.level + 1 then
      raise exception 'level_locked';
    end if;
    v_points := coalesce(
      (select points from level_points where level = p_ref),
      case when p_ref % 5 = 0 then 4 else 1 end
    );
  elsif p_kind = 'daily' then
    -- The day's challenge goes by the player's own date: a day either side of
    -- Paris (other time zones, or solved just before midnight and sent later).
    if p_ref is null or p_ref not in (
      to_char(v_today - 1, 'YYYYMMDD')::integer,
      to_char(v_today, 'YYYYMMDD')::integer,
      to_char(v_today + 1, 'YYYYMMDD')::integer
    ) then
      raise exception 'daily_closed';
    end if;
    v_points := 3;
  else
    raise exception 'bad_kind';
  end if;

  v_today_points := case when v_profile.points_day = v_today then v_profile.points_today else 0 end;
  v_points := least(v_points, greatest(0, 60 - v_today_points));

  insert into solves (player, kind, ref, points, week) values (v_me, p_kind, p_ref, v_points, v_week)
    on conflict do nothing;
  if not found then
    -- Already counted: a replay, or the same solve sent twice.
    return json_build_object(
      'points', 0,
      'week_points', coalesce((select points from league_members where week = v_week and player = v_me), 0)
    );
  end if;

  perform join_league(v_me, v_week);
  update league_members
    set points = points + v_points, reached_at = case when v_points > 0 then v_now else reached_at end
    where week = v_week and player = v_me
    returning points into v_total;
  update profiles set
    level = case when p_kind = 'level' then greatest(level, p_ref + 1) else level end,
    points_day = v_today,
    points_today = v_today_points + v_points
    where id = v_me;
  return json_build_object('points', v_points, 'week_points', v_total);
end
$$;

/** The caller's league of the week (empty until their first garden of the week), and when the week ends. */
create function public.get_league() returns json
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := me();
  v_week date := week_of(now());
  v_league bigint;
begin
  select league into v_league from league_members where week = v_week and player = v_me;
  return json_build_object(
    'week_end', (v_week + 7)::timestamp at time zone 'Europe/Paris',
    'members', case when v_league is null then '[]'::json else league_rows(v_league, v_me) end
  );
end
$$;

/** The caller and their friends, with their points of the week. */
create function public.get_friends() returns json
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := me();
  v_week date := week_of(now());
begin
  return (
    select coalesce(json_agg(r order by r.points desc, r.level desc, r.name), '[]'::json) from (
      select p.id, p.id = v_me as me, coalesce(p.name, '') as name, p.avatar, p.level, coalesce(m.points, 0) as points
      from profiles p
      left join league_members m on m.player = p.id and m.week = v_week
      where p.id = v_me
         or p.id in (select case when f.a = v_me then f.b else f.a end from friendships f where f.a = v_me or f.b = v_me)
    ) r
  );
end
$$;

/** Become friends (both ways) with the player whose friend code this is. */
create function public.add_friend(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := me();
  v_friend profiles;
begin
  select * into v_friend from profiles where friend_code = upper(btrim(coalesce(p_code, '')));
  if not found then
    raise exception 'friend_unknown';
  end if;
  if v_friend.id = v_me then
    raise exception 'friend_self';
  end if;
  if (select count(*) from friendships where a = v_me or b = v_me) >= 100 then
    raise exception 'friend_limit';
  end if;
  insert into friendships (a, b) values (least(v_me, v_friend.id), greatest(v_me, v_friend.id))
    on conflict do nothing;
  return json_build_object('id', v_friend.id, 'name', coalesce(v_friend.name, ''), 'avatar', v_friend.avatar, 'level', v_friend.level);
end
$$;

create function public.remove_friend(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := me();
begin
  delete from friendships where a = least(v_me, p_id) and b = greatest(v_me, p_id);
end
$$;

/**
 * Results of the caller's leagues of the weeks now over, not handed out yet:
 * week, rank, league size, and the prize (hints and zones; nothing below the
 * fifth place, nor without a single point). Each week is handed out once.
 */
create function public.claim_rewards() returns json
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := me();
  v_row record;
  v_rank integer;
  v_size integer;
  v_points integer;
  v_hints integer;
  v_zones integer;
  v_out json[] := '{}';
begin
  for v_row in
    select m.week, m.league from league_members m
    where m.player = v_me and m.week < week_of(now())
      and not exists (select 1 from rewards_claimed c where c.player = v_me and c.week = m.week)
    order by m.week
  loop
    select x.rank, x.size, x.points into v_rank, v_size, v_points from (
      select player, points,
        row_number() over (order by points desc, reached_at, player) as rank,
        count(*) over () as size
      from league_members where league = v_row.league
    ) x where x.player = v_me;
    v_hints := case when v_points = 0 then 0 else case v_rank when 1 then 5 when 2 then 3 when 4 then 2 when 5 then 1 else 0 end end;
    v_zones := case when v_points = 0 then 0 else case v_rank when 1 then 3 when 2 then 1 when 3 then 1 else 0 end end;
    insert into rewards_claimed (player, week, rank, hints, zones) values (v_me, v_row.week, v_rank, v_hints, v_zones);
    v_out := v_out || json_build_object('week', v_row.week, 'rank', v_rank, 'size', v_size, 'points', v_points, 'hints', v_hints, 'zones', v_zones);
  end loop;
  return to_json(v_out);
end
$$;

-- ---------- Access ----------

revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.ensure_profile(),
  public.set_profile(text, integer),
  public.sync_level(integer),
  public.submit_solve(text, integer),
  public.get_league(),
  public.get_friends(),
  public.add_friend(text),
  public.remove_friend(uuid),
  public.claim_rewards()
to authenticated;
