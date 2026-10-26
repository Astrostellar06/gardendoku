/**
 * First-launch tutorial: a tiny 3x3 garden where a single tile has to be
 * turned, then a tile to lock. The game controller drives the steps.
 */
import { Board } from './core/board';
import { Puzzle } from './core/generator';
import { E, Grid, N, S, W } from './core/grid';

/** The tile the player turns (one tap clockwise solves the garden). */
export const TURN_CELL = 5;
/** The tile the player locks with a long press. */
export const LOCK_CELL = 0;

export type TutorialStep = 'intro' | 'turn' | 'flowing' | 'bloom' | 'lock' | 'done';

export interface StepInfo {
  text: string;
  /** Label of the button that moves on, or null when the player must act on the garden. */
  button: string | null;
  /** Tile under the spotlight, and how to act on it. */
  focus: { cell: number; kind: 'tap' | 'hold' } | null;
}

export const STEPS: Record<TutorialStep, StepInfo> = {
  intro: {
    text: "Bienvenue au Jardin des Sources ! L'eau jaillit de la source, au centre. Relie toutes les parcelles à la source pour faire fleurir le jardin.",
    button: 'Commencer',
    focus: null,
  },
  turn: {
    text: 'Ce canal ne mène nulle part. Touche cette parcelle pour la faire tourner.',
    button: null,
    focus: { cell: TURN_CELL, kind: 'tap' },
  },
  flowing: {
    text: "Regarde l'eau couler…",
    button: null,
    focus: null,
  },
  bloom: {
    text: "Bravo ! L'eau atteint toutes les parcelles : le jardin est fleuri. Seule règle : pas de boucle, l'eau doit former un seul réseau.",
    button: 'Suivant',
    focus: null,
  },
  lock: {
    text: 'Quand tu es sûr d’une parcelle, garde le doigt appuyé dessus pour la verrouiller.',
    button: null,
    focus: { cell: LOCK_CELL, kind: 'hold' },
  },
  done: {
    text: 'Parfait ! Une parcelle verrouillée ne tourne plus par erreur. Glisse ensuite le doigt pour en verrouiller plusieurs, ou utilise le bouton Verrou.',
    button: "C'est parti !",
    focus: null,
  },
};

export const STEP_ORDER: TutorialStep[] = ['intro', 'turn', 'flowing', 'bloom', 'lock', 'done'];

/** Position shown to the player ("2 / 4"): the steps where something is explained. */
export function stepNumber(step: TutorialStep): [number, number] {
  const shown: TutorialStep[] = ['intro', 'turn', 'bloom', 'lock', 'done'];
  const k = shown.indexOf(step === 'flowing' ? 'turn' : step);
  return [k + 1, shown.length];
}

/**
 * The garden: spring in the middle, every tile in place except TURN_CELL, which
 * is a quarter turn short, so its two neighbours above stay dry.
 */
export function buildTutorialBoard(): Board {
  const grid = Grid.rect(3, 3);
  const solution = new Uint8Array([S, E, S | W, N | E, E | W | S, W | N, E, N | E | W, W]);
  const puzzle: Puzzle = { grid, source: 4, solution, tiles: solution.slice(), unique: true, repairs: 0 };
  const board = new Board(puzzle);
  board.rot[TURN_CELL] = 3;
  return board;
}
