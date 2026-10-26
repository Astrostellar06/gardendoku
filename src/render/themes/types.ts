/** Garden styles: palette, scenery, ambient particles and the little props scattered on tiles. */
import type { Palette } from '../palette';

export type ThemeId =
  | 'printemps'
  | 'japon'
  | 'automne'
  | 'hiver'
  | 'savane'
  | 'desert'
  | 'jungle'
  | 'sauvage'
  | 'amitie'
  | 'ete'
  | 'roseraie'
  | 'verger'
  | 'champs'
  | 'francais'
  | 'urbain'
  | 'montagne'
  | 'canyon'
  | 'parcs';

export type AmbientKind = 'petals' | 'sakura' | 'leaves' | 'snow' | 'pollen' | 'sand' | 'fireflies' | 'seeds' | 'hearts';

/** What a prop drawer receives. It draws around (0, 0); "up" is -y. */
export interface PropDraw {
  /** Footprint radius (tile units): the drawing should stay roughly within it. */
  r: number;
  /** Growth of the tile (0 = dry, 1 = fully bloomed). */
  bloom: number;
  /** Water in the tile (0..1). */
  water: number;
  /** Seconds, for animated props (0 in cached drawings). */
  time: number;
  /** Two stable random numbers in [0, 1) for variations. */
  v: number;
  v2: number;
  /** Screen-aligned canal props: the canal runs vertically ('v') or horizontally ('h') on screen. */
  axis?: 'v' | 'h';
}

export interface PropDef {
  id: string;
  /**
   * ground: in the free space around the canals;
   * canal: across a canal arm (bridges) — local x crosses the canal, +y runs outward;
   * water: in the canal water, same frame as canal.
   */
  place: 'ground' | 'canal' | 'water';
  /** Footprint radius range. */
  size: [number, number];
  weight: number;
  /** 'always' props are there on dry tiles too; 'bloom' props pop up with the water. */
  when: 'always' | 'bloom';
  /** Drawn standing upright on screen (trees, animals, buildings). */
  upright?: boolean;
  /** Drawn every frame in the overlay (koi swimming...) instead of the cached tile. */
  animated?: boolean;
  /** Canal props drawn in screen orientation (2.5D bridges), told the canal's axis. */
  screen?: boolean;
  /**
   * Upright props are drawn bigger than their footprint, growing upward from
   * their base (default 1.5): trees and lanterns may rise over the canal behind them.
   */
  drawScale?: number;
  draw(ctx: CanvasRenderingContext2D, p: PropDraw): void;
}

/** Stable per-tile random numbers, for ground textures. */
export interface GroundInfo {
  rnd: number[];
  tint: number;
}

export interface Theme {
  id: ThemeId;
  name: string;
  /** One-line description for the style menu. */
  blurb: string;
  palette: Palette;
  ambient: AmbientKind;
  ambientColors: string[];
  /** What flutters over the garden on victory. */
  creature: 'butterfly' | 'none';
  props: PropDef[];
  /** Chance for a tile to get a first prop, then a second one. */
  propChance: number;
  extraChance: number;
  /** Texture over the dry soil. */
  dryGround?(ctx: CanvasRenderingContext2D, g: GroundInfo): void;
  /** Texture over the grown ground. */
  bloomGround?(ctx: CanvasRenderingContext2D, g: GroundInfo): void;
  /** Replaces the small round flowers; draws around (0, 0) with radius r. */
  smallFlower?(ctx: CanvasRenderingContext2D, r: number, color: string, center: string): void;
  /** Replaces the grass tufts (s = size), upright. */
  tuft?(ctx: CanvasRenderingContext2D, s: number): void;
  /** End-of-canal bloom in the basin (default: lotus on a lily pad); t = 0..1. */
  basin?(ctx: CanvasRenderingContext2D, r: number, g: GroundInfo, t: number): void;
  /** Background extras: mountains, dunes, hills... */
  scenery(ctx: CanvasRenderingContext2D, w: number, h: number): void;
}
