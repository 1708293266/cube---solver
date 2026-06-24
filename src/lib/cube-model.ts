export type FaceName = 'U' | 'D' | 'F' | 'B' | 'L' | 'R';
export type ColorName = 'white' | 'yellow' | 'green' | 'blue' | 'orange' | 'red';

export const FACE_COLORS_HEX: Record<FaceName, string> = {
  U: '#FFD500',
  D: '#FFFFFF',
  F: '#009E60',
  B: '#0051BA',
  L: '#C41E3A',
  R: '#FF5800',
};

export const COLOR_HEX_MAP: Record<ColorName, string> = {
  white: '#FFFFFF',
  yellow: '#FFD500',
  green: '#009E60',
  blue: '#0051BA',
  orange: '#FF5800',
  red: '#C41E3A',
};

export type Move = {
  face: FaceName;
  clockwise: boolean;
  double?: boolean;
  notation: string;
};

export interface CubeState {
  faces: Record<FaceName, ColorName[]>;
}

export function createSolvedCube(): CubeState {
  return {
    faces: {
      U: Array(9).fill('yellow' as ColorName),
      D: Array(9).fill('white' as ColorName),
      F: Array(9).fill('green' as ColorName),
      B: Array(9).fill('blue' as ColorName),
      L: Array(9).fill('red' as ColorName),
      R: Array(9).fill('orange' as ColorName),
    },
  };
}

export function cloneState(state: CubeState): CubeState {
  return {
    faces: {
      U: [...state.faces.U],
      D: [...state.faces.D],
      F: [...state.faces.F],
      B: [...state.faces.B],
      L: [...state.faces.L],
      R: [...state.faces.R],
    },
  };
}

function rotateFaceClockwise(face: ColorName[]): ColorName[] {
  const r = [...face];
  r[0] = face[6]; r[1] = face[3]; r[2] = face[0];
  r[3] = face[7]; r[5] = face[1];
  r[6] = face[8]; r[7] = face[5]; r[8] = face[2];
  return r;
}

function rotateFaceCounterClockwise(face: ColorName[]): ColorName[] {
  const r = [...face];
  r[0] = face[2]; r[1] = face[5]; r[2] = face[8];
  r[3] = face[1]; r[5] = face[7];
  r[6] = face[0]; r[7] = face[3]; r[8] = face[6];
  return r;
}

// Side strips mapping - each face rotation affects 4 side strips of 3 stickers each
// The strips are listed in clockwise order around the rotated face (looking at the face)
const SIDE_STRIPS: Record<FaceName, { face: FaceName; indices: [number, number, number] }[]> = {
 U: [
    { face: 'F', indices: [0, 1, 2] },
    { face: 'L', indices: [0, 1, 2] },
    { face: 'B', indices: [0, 1, 2] },
    { face: 'R', indices: [0, 1, 2] },
  ],
  D: [
    { face: 'F', indices: [6, 7, 8] },
    { face: 'R', indices: [6, 7, 8] },
    { face: 'B', indices: [6, 7, 8] },
    { face: 'L', indices: [6, 7, 8] },
  ],
  F: [
    { face: 'U', indices: [6, 7, 8] },
    { face: 'R', indices: [0, 3, 6] },
    { face: 'D', indices: [2, 1, 0] },
    { face: 'L', indices: [8, 5, 2] },
  ],
  B: [
    { face: 'U', indices: [2, 1, 0] },
    { face: 'L', indices: [0, 3, 6] },
    { face: 'D', indices: [6, 7, 8] },
    { face: 'R', indices: [8, 5, 2] },
  ],
  L: [
    { face: 'U', indices: [0, 3, 6] },
    { face: 'F', indices: [0, 3, 6] },
    { face: 'D', indices: [0, 3, 6] },
    { face: 'B', indices: [8, 5, 2] },
  ],
  R: [
    { face: 'U', indices: [8, 5, 2] },
    { face: 'B', indices: [0, 3, 6] },
    { face: 'D', indices: [8, 5, 2] },
    { face: 'F', indices: [8, 5, 2] },
  ],
};

export function applyMove(state: CubeState, move: Move): CubeState {
  const s = cloneState(state);
  const { face, clockwise, double } = move;
  const times = double ? 2 : 1;

  for (let t = 0; t < times; t++) {
    s.faces[face] = clockwise
      ? rotateFaceClockwise(s.faces[face])
      : rotateFaceCounterClockwise(s.faces[face]);

    const strips = SIDE_STRIPS[face];
    if (clockwise) {
      // Clockwise: strip[0] <- strip[3], strip[1] <- strip[0], strip[2] <- strip[1], strip[3] <- strip[2]
      for (let i = 0; i < 3; i++) {
        const temp = s.faces[strips[3].face][strips[3].indices[i]];
        s.faces[strips[3].face][strips[3].indices[i]] = s.faces[strips[2].face][strips[2].indices[i]];
        s.faces[strips[2].face][strips[2].indices[i]] = s.faces[strips[1].face][strips[1].indices[i]];
        s.faces[strips[1].face][strips[1].indices[i]] = s.faces[strips[0].face][strips[0].indices[i]];
        s.faces[strips[0].face][strips[0].indices[i]] = temp;
      }
    } else {
      // Counter-clockwise: strip[0] <- strip[1], strip[1] <- strip[2], strip[2] <- strip[3], strip[3] <- strip[0]
      for (let i = 0; i < 3; i++) {
        const temp = s.faces[strips[0].face][strips[0].indices[i]];
        s.faces[strips[0].face][strips[0].indices[i]] = s.faces[strips[1].face][strips[1].indices[i]];
        s.faces[strips[1].face][strips[1].indices[i]] = s.faces[strips[2].face][strips[2].indices[i]];
        s.faces[strips[2].face][strips[2].indices[i]] = s.faces[strips[3].face][strips[3].indices[i]];
        s.faces[strips[3].face][strips[3].indices[i]] = temp;
      }
    }
  }

  return s;
}

export function parseMove(notation: string): Move {
  const face = notation[0] as FaceName;
  const double = notation.includes('2');
  const clockwise = double ? true : !notation.includes("'");
  return { face, clockwise, double, notation };
}

export function generateScramble(length = 20): string[] {
  const faces: FaceName[] = ['U', 'D', 'F', 'B', 'L', 'R'];
  const modifiers = ['', "'", '2'];
  const moves: string[] = [];
  let lastFace: FaceName | null = null;
  let secondLastFace: FaceName | null = null;

  for (let i = 0; i < length; i++) {
    let face: FaceName;
    do {
      face = faces[Math.floor(Math.random() * faces.length)];
    } while (
      face === lastFace ||
      (face === secondLastFace && areOppositeFaces(face, lastFace!))
    );

    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    moves.push(face + modifier);
    secondLastFace = lastFace;
    lastFace = face;
  }

  return moves;
}

function areOppositeFaces(a: FaceName, b: FaceName): boolean {
  return (
    (a === 'U' && b === 'D') || (a === 'D' && b === 'U') ||
    (a === 'F' && b === 'B') || (a === 'B' && b === 'F') ||
    (a === 'L' && b === 'R') || (a === 'R' && b === 'L')
  );
}

export function isSolved(state: CubeState): boolean {
  return (['U', 'D', 'F', 'B', 'L', 'R'] as FaceName[]).every(face => {
    const first = state.faces[face][0];
    return state.faces[face].every(c => c === first);
  });
}

export function getFaceColorAt(state: CubeState, face: FaceName, index: number): string {
  return COLOR_HEX_MAP[state.faces[face][index]];
}

export function invertMove(notation: string): string {
  if (notation.includes('2')) return notation;
  if (notation.includes("'")) return notation.replace("'", "");
  return notation + "'";
}

// ============================================================
// Bidirectional BFS Solver with move pruning.
// Covers states up to ~14 moves from solved efficiently.
// ============================================================

const ALL_MOVES: string[] = [
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
  'L', "L'", 'L2',
  'R', "R'", 'R2',
];

function applyNotation(state: CubeState, notation: string): CubeState {
  return applyMove(state, parseMove(notation));
}

function stateToString(state: CubeState): string {
  return (['U', 'D', 'F', 'B', 'L', 'R'] as FaceName[])
    .map(f => state.faces[f].join(''))
    .join('|');
}

function invertNotation(notation: string): string {
  if (notation.includes('2')) return notation;
  if (notation.includes("'")) return notation.replace("'", "");
  return notation + "'";
}

function getFace(notation: string): string {
  return notation[0];
}

// Bidirectional BFS with move pruning: skip consecutive same-face moves
function bidirectionalBFS(startState: CubeState, maxDepth: number): string[] | null {
  if (isSolved(startState)) return [];

  const startVisited = new Map<string, string[]>();
  const goalVisited = new Map<string, string[]>();
  const solved = createSolvedCube();

  startVisited.set(stateToString(startState), []);
  goalVisited.set(stateToString(solved), []);

  let startFrontier: { state: CubeState; path: string[] }[] = [{ state: startState, path: [] }];
  let goalFrontier: { state: CubeState; path: string[] }[] = [{ state: solved, path: [] }];

  for (let depth = 0; depth < maxDepth; depth++) {
    // Expand start frontier (smaller one first for balance)
    const newStartFrontier: { state: CubeState; path: string[] }[] = [];
    for (const item of startFrontier) {
      const lastFace = item.path.length > 0 ? getFace(item.path[item.path.length - 1]) : '';
      for (const move of ALL_MOVES) {
        if (getFace(move) === lastFace) continue;

        const newState = applyNotation(item.state, move);
        const key = stateToString(newState);
        if (startVisited.has(key)) continue;
        const newPath = [...item.path, move];
        startVisited.set(key, newPath);
        if (goalVisited.has(key)) {
          const goalPath = goalVisited.get(key)!;
          const invertedGoal = goalPath.slice().reverse().map(invertNotation);
          return [...newPath, ...invertedGoal];
        }
        if (depth < maxDepth - 1) {
          newStartFrontier.push({ state: newState, path: newPath });
        }
      }
    }
    startFrontier = newStartFrontier;

    // Expand goal frontier
    const newGoalFrontier: { state: CubeState; path: string[] }[] = [];
    for (const item of goalFrontier) {
      const lastFace = item.path.length > 0 ? getFace(item.path[item.path.length - 1]) : '';
      for (const move of ALL_MOVES) {
        if (getFace(move) === lastFace) continue;

        const newState = applyNotation(item.state, move);
        const key = stateToString(newState);
        if (goalVisited.has(key)) continue;
        const newPath = [...item.path, move];
        goalVisited.set(key, newPath);
        if (startVisited.has(key)) {
          const startPath = startVisited.get(key)!;
          const invertedGoal = newPath.slice().reverse().map(invertNotation);
          return [...startPath, ...invertedGoal];
        }
        if (depth < maxDepth - 1) {
          newGoalFrontier.push({ state: newState, path: newPath });
        }
      }
    }
    goalFrontier = newGoalFrontier;
  }

  return null;
}

export function solveCube(state: CubeState): string[] | null {
  if (isSolved(state)) return [];

  // Bidirectional BFS with depth 7 covers most practical states (~14 moves total)
  return bidirectionalBFS(state, 7);
}
