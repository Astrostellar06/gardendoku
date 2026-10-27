/**
 * Guided tutorials, played on tiny hand-made gardens. The game controller
 * drives the steps.
 *
 * - basics (first launch): a 3x3 garden with two tiles a quarter turn short.
 *   The player turns the first one under a spotlight, watches the water,
 *   learns to lock a tile, then finishes the garden alone.
 * - wrap (before the first hard level): a 3x3 garden whose edges are joined.
 *   The player sends water through an edge, then turns a tile by touching its
 *   faded copy on the other side.
 */
import { Board } from './core/board';
import { Puzzle } from './core/generator';
import { E, Grid, N, S, W } from './core/grid';

export type TutorialId = 'basics' | 'wrap';

export interface TutorialStep {
  text: string;
  /**
   * What moves the tutorial on: 'read' the button; 'turn' turning `cell` into
   * place; 'hold' locking `cell`; 'free' finishing the garden alone (`cell`
   * gets a spotlight if the player is stuck).
   */
  kind: 'read' | 'turn' | 'hold' | 'free';
  /** Label of the button ('read' steps). */
  button?: string;
  cell?: number;
  /** Spotlight the faded copy of `cell` in the strip below the garden. */
  ghost?: boolean;
  /** Position shown to the player ("2 / 5"). */
  number: number;
}

export interface Tutorial {
  steps: TutorialStep[];
  /** Number of positions shown ("/ 5"). */
  count: number;
  build(): Board;
}

/** Seconds before the last tile gets a spotlight, if the player is stuck. */
export const LAST_HINT_DELAY = 10;

/** First tile to turn, under the spotlight (one tap clockwise). */
const TURN_CELL = 5;
/** Last tile, which the player finds and turns alone (one tap clockwise). */
const LAST_CELL = 7;
/** Tile locked with a long press. */
const LOCK_CELL = 0;

/**
 * The garden: spring in the middle, every tile in place except TURN_CELL and
 * LAST_CELL, each a quarter turn short, leaving three tiles dry.
 */
function buildBasicsBoard(): Board {
  const grid = Grid.rect(3, 3);
  const solution = new Uint8Array([S, E, S | W, N | E, E | W | S, W | N, E, N | E | W, W]);
  const puzzle: Puzzle = { grid, source: 4, solution, tiles: solution.slice(), unique: true, repairs: 0 };
  const board = new Board(puzzle);
  board.rot[TURN_CELL] = 3;
  board.rot[LAST_CELL] = 3;
  return board;
}

/** Top right tile, reached through the left edge (one tap clockwise). */
const EDGE_CELL = 2;
/** Top middle tile, reached through the bottom edge; turned from its copy below the garden. */
const GHOST_CELL = 1;

/**
 * A 3x3 garden with joined edges. Water runs from the spring to the left
 * edge and comes back on the right into EDGE_CELL; it leaves through the
 * bottom edge into GHOST_CELL at the top. Both are a quarter turn short.
 */
function buildWrapBoard(): Board {
  const grid = Grid.rect(3, 3, true);
  const solution = new Uint8Array([S | W, N, E, N | E, E | S | W, S | W, W, N | S, N | E]);
  const puzzle: Puzzle = { grid, source: 4, solution, tiles: solution.slice(), unique: true, repairs: 0 };
  const board = new Board(puzzle);
  board.rot[EDGE_CELL] = 3;
  board.rot[GHOST_CELL] = 3;
  return board;
}

export const TUTORIALS: Record<TutorialId, Tutorial> = {
  basics: {
    count: 5,
    build: buildBasicsBoard,
    steps: [
      {
        text: "Bienvenue dans Gardendoku ! L'eau jaillit de la source, au centre. Relie toutes les parcelles à la source pour faire fleurir le jardin.",
        kind: 'read',
        button: 'Commencer',
        number: 1,
      },
      {
        text: 'Ce canal ne mène nulle part. Touche cette parcelle pour la faire tourner.',
        kind: 'turn',
        cell: TURN_CELL,
        number: 2,
      },
      {
        text: "Regarde l'eau couler jusqu'aux parcelles qui étaient sèches : elles se mettent à fleurir !",
        kind: 'read',
        button: 'Suivant',
        number: 2,
      },
      {
        text: 'Quand tu es sûr d’une parcelle, garde le doigt appuyé dessus pour la verrouiller.',
        kind: 'hold',
        cell: LOCK_CELL,
        number: 3,
      },
      {
        text: 'Parfait, elle est verrouillée : elle ne tournera plus par erreur. À toi de terminer le jardin : une dernière parcelle est mal tournée.',
        kind: 'free',
        cell: LAST_CELL,
        number: 4,
      },
      {
        text: "Bravo ! L'eau atteint toutes les parcelles : le jardin est fleuri. Une seule règle : pas de boucle, l'eau doit former un seul réseau. Astuce : glisse le doigt pour verrouiller plusieurs parcelles d'un coup.",
        kind: 'read',
        button: "C'est parti !",
        number: 5,
      },
    ],
  },
  wrap: {
    count: 4,
    build: buildWrapBoard,
    steps: [
      {
        text: "Niveau difficile ! Ici, les bords du jardin sont reliés : l'eau qui sort d'un côté réapparaît du côté opposé.",
        kind: 'read',
        button: 'Voir comment',
        number: 1,
      },
      {
        text: "Cette parcelle est à sec. L'eau sort à gauche du jardin et revient par la droite : touche la parcelle pour tourner son canal vers le bord droit.",
        kind: 'turn',
        cell: EDGE_CELL,
        number: 2,
      },
      {
        text: "L'eau a traversé le bord ! Les bandes pâles autour du jardin montrent les parcelles du côté opposé.",
        kind: 'read',
        button: 'Suivant',
        number: 2,
      },
      {
        text: "Ces bandes se touchent aussi. Touche la parcelle pâle sous le jardin : c'est sa jumelle, tout en haut, qui tourne.",
        kind: 'turn',
        cell: GHOST_CELL,
        ghost: true,
        number: 3,
      },
      {
        text: "Le jardin a fleuri ! Dans ces niveaux, pense à l'autre côté : chaque bord cache une voisine. À toi de jouer sur un petit jardin.",
        kind: 'read',
        button: "C'est parti !",
        number: 4,
      },
    ],
  },
};
