-- No cap on the points of a day for now (the first version stopped at 60).
-- points_day / points_today stay in profiles, unused, should a limit come back.

create or replace function public.submit_solve(p_kind text, p_ref integer) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := me();
  v_now timestamptz := now();
  v_today date := (v_now at time zone 'Europe/Paris')::date;
  v_week date := week_of(v_now);
  v_profile profiles;
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
    set points = points + v_points, reached_at = v_now
    where week = v_week and player = v_me
    returning points into v_total;
  if p_kind = 'level' then
    update profiles set level = greatest(level, p_ref + 1) where id = v_me;
  end if;
  return json_build_object('points', v_points, 'week_points', v_total);
end
$$;

revoke execute on function public.submit_solve(text, integer) from public, anon;
grant execute on function public.submit_solve(text, integer) to authenticated;
