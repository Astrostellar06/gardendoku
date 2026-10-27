/**
 * League card (the week's league of 20, and the friends' league), profile
 * card (avatar and name) and the card that closes a week with its prize.
 */
import type { PlayerRow, WeekResult } from '../online/backend';
import { LEAGUE_PRIZES } from '../online/points';
import { listJoin, ordinal, t, tn } from '../i18n';
import { Social, socialErrorText } from '../online/social';
import { AVATARS, avatarName, avatarSvg } from './avatars';
import type { Hud } from './hud';
import { shareOrCopy } from './share';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

type Tab = 'league' | 'friends';

export { ordinal };

const ZONE_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="4.5" width="15" height="15" rx="3.2" /><path d="M9.5 4.5v15M14.5 4.5v15M4.5 9.5h15M4.5 14.5h15" /></svg>';
const HINT_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c2.6 3.1 5.5 6.3 5.5 9.6a5.5 5.5 0 0 1-11 0c0-3.3 2.9-6.5 5.5-9.6Z" /></svg>';

/** "1 zone et 3 indices" / "1 zone and 3 hints". */
export function prizeText(prize: { zones: number; hints: number }): string {
  const parts: string[] = [];
  if (prize.zones) parts.push(tn('count.zone', prize.zones));
  if (prize.hints) parts.push(tn('count.hint', prize.hints));
  return listJoin(parts);
}

function prizeChips(prize: { zones: number; hints: number }): string {
  let html = '';
  if (prize.zones) html += `<span class="prize-chip zone">${ZONE_ICON}${prize.zones}</span>`;
  if (prize.hints) html += `<span class="prize-chip hint">${HINT_ICON}${prize.hints}</span>`;
  return html;
}

/** "3 j 5 h", "5 h 12 min", "12 min" ("3d 5h" in English). */
function timeLeft(end: Date): string {
  const min = Math.max(0, Math.round((end.getTime() - Date.now()) / 60000));
  const days = Math.floor(min / 1440);
  const hours = Math.floor((min % 1440) / 60);
  if (days > 0) return t('time.daysHours', { d: days, h: hours });
  if (hours > 0) return t('time.hoursMinutes', { h: hours, m: String(min % 60).padStart(2, '0') });
  return t('time.minutes', { m: min });
}

function escape(text: string): string {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

export interface LeagueHooks {
  toast(text: string): void;
  /** Prize of a finished week: hints and zones to add to the player's stock. */
  reward(result: WeekResult): void;
  /** The badge on the home screen changed (rank of the week, or none). */
  badge(rank: number | null): void;
}

export class LeagueScreen {
  private tab: Tab = 'league';
  private avatar = 0;
  /** Called once the profile card is saved (e.g. to open the league next). */
  private afterProfile: (() => void) | null = null;
  private results: WeekResult[] = [];

  constructor(
    private hud: Hud,
    private social: Social,
    private hooks: LeagueHooks,
  ) {
    for (const tab of document.querySelectorAll<HTMLElement>('.league-tab')) {
      tab.addEventListener('click', () => this.show(tab.dataset.tab as Tab));
    }
    $('btn-profile').addEventListener('click', () => this.openProfile());
    $('btn-profile-save').addEventListener('click', () => void this.saveProfile());
    $('profile-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void this.saveProfile();
    });
    $('btn-invite').addEventListener('click', () => void this.invite());
    $('friend-add').addEventListener('submit', (e) => {
      e.preventDefault();
      void this.addFriend($<HTMLInputElement>('friend-code-input').value);
    });
    $('friend-code-input').addEventListener('input', (e) => {
      const input = e.target as HTMLInputElement;
      input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    $('league-list').addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-remove]');
      if (btn) void this.removeFriend(btn);
      const retry = (e.target as HTMLElement).closest('[data-retry]');
      if (retry) void this.show(this.tab);
    });
    // The next week's result, after the current one is closed.
    this.hud.leagueResult.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-close]')) setTimeout(() => this.nextResult(), 320);
    });

    const grid = $('avatar-grid');
    for (const a of AVATARS) {
      const b = document.createElement('button');
      b.className = 'avatar-pick';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', avatarName(a));
      b.title = avatarName(a);
      b.innerHTML = a.svg;
      b.addEventListener('click', () => this.pickAvatar(a.id));
      grid.appendChild(b);
    }
  }

  /** League card; asks for a name first if the player has none yet. */
  open(tab: Tab = 'league') {
    if (this.social.profile && !this.social.profile.name) {
      this.openProfile(() => this.open(tab));
      return;
    }
    this.hud.open(this.hud.league);
    void this.show(tab);
  }

  private async show(tab: Tab) {
    this.tab = tab;
    for (const t of document.querySelectorAll<HTMLElement>('.league-tab')) {
      const on = t.dataset.tab === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    }
    $('friend-tools').classList.toggle('hidden', tab !== 'friends');
    const list = $('league-list');
    const sub = $('league-sub');
    list.innerHTML = `<p class="league-empty">${t('league.loading')}</p>`;
    sub.textContent = tab === 'league' ? t('league.subLeague') : t('league.subFriends');
    try {
      if (tab === 'league') {
        const league = await this.social.league();
        if (this.tab !== tab) return;
        sub.textContent = t('league.weekEnds', { time: timeLeft(league.weekEnd) });
        const mine = league.members.find((m) => m.me);
        this.hooks.badge(mine ? league.members.indexOf(mine) + 1 : null);
        if (!league.members.length) {
          list.innerHTML =
            `<p class="league-empty">${t('league.emptyLeague')}</p>` +
            '<div class="prize-table">' +
            LEAGUE_PRIZES.map((p, k) => `<div><b>${ordinal(k + 1)}</b>${prizeChips(p)}</div>`).join('') +
            '</div>';
          return;
        }
        list.innerHTML = league.members.map((m, k) => this.row(m, k + 1, LEAGUE_PRIZES[k], k === LEAGUE_PRIZES.length - 1)).join('');
      } else {
        const friends = await this.social.friends();
        if (this.tab !== tab) return;
        $('friend-code').textContent = this.social.profile?.friendCode ?? '······';
        list.innerHTML =
          friends.map((f, k) => this.row(f, k + 1)).join('') +
          (friends.length > 1 ? '' : `<p class="league-empty">${t('league.emptyFriends')}</p>`);
      }
      list.querySelector('.me')?.scrollIntoView({ block: 'nearest' });
    } catch (e) {
      if (this.tab !== tab) return;
      list.innerHTML = `<p class="league-empty">${escape(socialErrorText(e))}</p><button class="soft-btn" data-retry>${t('common.retry')}</button>`;
    }
  }

  private row(p: PlayerRow, rank: number, prize?: { zones: number; hints: number }, lastPrize = false): string {
    const name = p.name || (p.me ? t('league.you') : t('league.gardener'));
    const classes = ['league-row', p.me ? 'me' : '', rank <= 3 && prize ? `podium${rank}` : '', lastPrize ? 'last-prize' : ''].join(' ');
    const remove =
      this.tab === 'friends' && !p.me && p.id
        ? `<button class="friend-remove" data-remove="${escape(p.id)}" aria-label="${escape(t('league.removeFriend', { name }))}">×</button>`
        : '';
    return (
      `<div class="${classes}">` +
      `<span class="league-rank">${rank}</span>` +
      `<span class="league-avatar">${avatarSvg(p.avatar)}</span>` +
      `<span class="league-who"><b>${escape(name)}${p.me ? ` <i>(${t('league.youTag')})</i>` : ''}</b><small>${t('level.title', { n: p.level })}</small></span>` +
      (prize && p.points > 0 ? `<span class="league-prize">${prizeChips(prize)}</span>` : '') +
      `<span class="league-points"><b>${p.points}</b><small>${tn('league.pts', p.points)}</small></span>` +
      remove +
      '</div>'
    );
  }

  /** Two taps to remove a friend: the first one asks. */
  private async removeFriend(btn: HTMLElement) {
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed');
      btn.textContent = t('league.removeConfirm');
      setTimeout(() => {
        btn.classList.remove('armed');
        btn.textContent = '×';
      }, 3000);
      return;
    }
    try {
      await this.social.removeFriend(btn.dataset.remove!);
      void this.show('friends');
    } catch (e) {
      this.hooks.toast(socialErrorText(e));
    }
  }

  async addFriend(code: string): Promise<boolean> {
    const clean = code.trim().toUpperCase();
    if (!clean) return false;
    try {
      const friend = await this.social.addFriend(clean);
      $<HTMLInputElement>('friend-code-input').value = '';
      this.hooks.toast(t('league.friendAdded', { name: friend.name || t('league.thisGardener') }));
      if (!this.hud.league.classList.contains('hidden')) void this.show('friends');
      return true;
    } catch (e) {
      this.hooks.toast(socialErrorText(e));
      return false;
    }
  }

  private async invite() {
    const code = this.social.profile?.friendCode;
    if (!code) return;
    const site = import.meta.env.VITE_PUBLIC_URL as string | undefined;
    const link = site ? `\n${site.replace(/\/$/, '')}/?ami=${code}` : '';
    const text = t('league.inviteText', { code }) + link;
    const outcome = await shareOrCopy(text);
    if (outcome === 'copied') this.hooks.toast(t('toast.inviteCopied'));
  }

  // ---------- Profile ----------

  openProfile(after: (() => void) | null = null) {
    const p = this.social.profile;
    this.afterProfile = after;
    $('profile-intro').classList.toggle('hidden', !!p?.name);
    $<HTMLInputElement>('profile-name').value = p?.name ?? '';
    $('profile-error').textContent = '';
    this.pickAvatar(p?.avatar ?? 0);
    this.hud.close(this.hud.league);
    this.hud.open(this.hud.profile);
  }

  private pickAvatar(id: number) {
    this.avatar = id;
    $('avatar-grid')
      .querySelectorAll('.avatar-pick')
      .forEach((b, k) => {
        b.classList.toggle('picked', k === id);
        b.setAttribute('aria-checked', String(k === id));
      });
  }

  private async saveProfile() {
    const name = $<HTMLInputElement>('profile-name').value;
    const error = $('profile-error');
    error.textContent = '';
    try {
      await this.social.setProfile(name, this.avatar);
    } catch (e) {
      error.textContent = socialErrorText(e);
      return;
    }
    this.hud.close(this.hud.profile);
    const after = this.afterProfile;
    this.afterProfile = null;
    if (after) setTimeout(after, 280);
  }

  // ---------- End of the week ----------

  /** Finished weeks (rank and prize), shown one card after the other. */
  showResults(results: WeekResult[]) {
    this.results.push(...results);
    if (this.hud.leagueResult.classList.contains('hidden')) this.nextResult();
  }

  private nextResult() {
    const r = this.results.shift();
    if (!r) return;
    this.hooks.reward(r);
    const medal = $('league-result-medal');
    medal.textContent = String(r.rank);
    medal.className = `result-medal${r.rank <= 3 && (r.hints || r.zones) ? ` podium${r.rank}` : ''}`;
    $('league-result-text').textContent = tn('leagueResult.text', r.points, { rank: ordinal(r.rank), size: r.size });
    $('league-result-prize').textContent =
      r.hints || r.zones
        ? t('leagueResult.prize', { prize: prizeText(r) })
        : t('leagueResult.noPrize');
    this.hud.open(this.hud.leagueResult);
  }
}
