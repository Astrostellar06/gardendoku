-- Solve times of every garden, little by little replacing the estimated
-- "faster than X % of players" with real players' times.
--
-- One time per player and garden: the first solve (replays would be faster).
-- A garden is a level number or a daily challenge's day, for a version of the
-- level generator (the same number is another garden after a change).

create table public.solve_times (
  player uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('level', 'daily')),
  ref integer not null,
  generator integer not null,
  seconds integer not null check (seconds between 1 and 86400),
  moves integer not null check (moves >= 0),
  hints integer not null default 0 check (hints >= 0),
  zones integer not null default 0 check (zones >= 0),
  -- Seconds counted for the ranking: hints weigh 25 s, a zone hint three hints (as in the app).
  score integer generated always as (seconds + 25 * (hints + 3 * zones)) stored,
  at timestamptz not null default now(),
  primary key (player, kind, ref, generator)
);

create index solve_times_garden on public.solve_times (kind, ref, generator, score);

alter table public.solve_times enable row level security;

-- Below this many other players, the app keeps its own estimate.
create function public.time_rank_min() returns integer language sql immutable as $$ select 20 $$;

-- Record the player's time on a garden (the first one counts), and return how
-- it compares: share of the other players slower (1..99), and how many they are.
-- faster_than is null while there are too few of them.
create function public.record_time(
  p_kind text,
  p_ref integer,
  p_generator integer,
  p_seconds integer,
  p_moves integer,
  p_hints integer,
  p_zones integer
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := me();
  v_score integer;
  v_others integer;
  v_slower integer;
begin
  if p_kind not in ('level', 'daily') then
    raise exception 'bad_kind';
  end if;
  if p_seconds is null or p_seconds < 1 or p_seconds > 86400 or p_moves < 0 or p_hints < 0 or p_zones < 0 then
    raise exception 'bad_time';
  end if;
  insert into solve_times (player, kind, ref, generator, seconds, moves, hints, zones)
    values (v_me, p_kind, p_ref, p_generator, p_seconds, p_moves, coalesce(p_hints, 0), coalesce(p_zones, 0))
    on conflict do nothing;
  select score into v_score from solve_times
    where player = v_me and kind = p_kind and ref = p_ref and generator = p_generator;
  select count(*), count(*) filter (where score > v_score) into v_others, v_slower
    from solve_times
    where kind = p_kind and ref = p_ref and generator = p_generator and player <> v_me;
  return json_build_object(
    'players', v_others,
    'faster_than', case
      when v_others < time_rank_min() then null
      else least(99, greatest(1, round(100.0 * v_slower / v_others)))::integer
    end
  );
end
$$;

revoke all on public.solve_times from anon, authenticated;
revoke execute on function public.record_time(text, integer, integer, integer, integer, integer, integer) from public, anon;
revoke execute on function public.time_rank_min() from public, anon, authenticated;
grant execute on function public.record_time(text, integer, integer, integer, integer, integer, integer) to authenticated;
