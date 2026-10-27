/**
 * First-launch tutorial: a tiny 3x3 garden with two tiles a quarter turn
 * short. The player turns the first one under a spotlight, watches the water,
 * learns to lock a tile, then finishes the garden alone. The game controller
 * drives the steps.
 */
import { Board } from './core/board';
import { Puzzle } from './core/generator';
import { E, Grid, N, S, W } from './core/grid';

/** First tile to turn, under the spotlight (one tap clockwise). */
export const TURN_CELL = 5;
/** Last tile, which the player finds and turns alone (one tap clockwise). */
export const LAST_CELL = 7;
/** Tile locked with a long press. */
export const LOCK_CELL = 0;
/** Seconds before the last tile gets a spotlight, if the player is stuck. */
export const LAST_HINT_DELAY = 10;

export type TutorialStep = 'intro' | 'turn' | 'flowing' | 'lock' | 'finish' | 'bravo';

export interface StepInfo {
  text: string;
  /** Label of the button that moves on, or null when the player must act on the garden. */
  button: string | null;
  /** Tile under the spotlight, and how to act on it. */
  focus: { cell: number; kind: 'tap' | 'hold' } | null;
  /** Position shown to the player ("2 / 5"). */
  number: number;
}

export const STEP_COUNT = 5;

export const STEPS: Record<TutorialStep, StepInfo> = {
  intro: {
    text: "Bienvenue dans Gardendoku ! L'eau jaillit de la source, au centre. Relie toutes les parcelles à la source pour faire fleurir le jardin.",
    button: 'Commencer',
    focus: null,
    number: 1,
  },
  turn: {
    text: 'Ce canal ne mène nulle part. Touche cette parcelle pour la faire tourner.',
    button: null,
    focus: { cell: TURN_CELL, kind: 'tap' },
    number: 2,
  },
  flowing: {
    text: "Regarde l'eau couler jusqu'aux parcelles qui étaient sèches : elles se mettent à fleurir !",
    button: 'Suivant',
    focus: null,
    number: 2,
  },
  lock: {
    text: 'Quand tu es sûr d’une parcelle, garde le doigt appuyé dessus pour la verrouiller.',
    button: null,
    focus: { cell: LOCK_CELL, kind: 'hold' },
    number: 3,
  },
  finish: {
    text: 'Parfait, elle est verrouillée : elle ne tournera plus par erreur. À toi de terminer le jardin : une dernière parcelle est mal tournée.',
    button: null,
    focus: null,
    number: 4,
  },
  bravo: {
    text: "Bravo ! L'eau atteint toutes les parcelles : le jardin est fleuri. Une seule règle : pas de boucle, l'eau doit former un seul réseau. Astuce : glisse le doigt pour verrouiller plusieurs parcelles d'un coup.",
    button: "C'est parti !",
    focus: null,
    number: 5,
  },
};

/**
 * The garden: spring in the middle, every tile in place except TURN_CELL and
 * LAST_CELL, each a quarter turn short, leaving three tiles dry.
 */
export function buildTutorialBoard(): Board {
  const grid = Grid.rect(3, 3);
  const solution = new Uint8Array([S, E, S | W, N | E, E | W | S, W | N, E, N | E | W, W]);
  const puzzle: Puzzle = { grid, source: 4, solution, tiles: solution.slice(), unique: true, repairs: 0 };
  const board = new Board(puzzle);
  board.rot[TURN_CELL] = 3;
  board.rot[LAST_CELL] = 3;
  return board;
}
