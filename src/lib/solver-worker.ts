import Cube from 'cubejs';

// ============================================================
// Rubik's Cube Solver Worker
// 策略：双轨求解
//   轨道1（立即）：历史逆序 → 0ms内出解，用户立刻看到结果
//   轨道2（后台）：Kociemba两阶段 → 初始化后给出更短解法
//   两轨并行，先到先显示，用户不会感知"卡住"
// ============================================================

// ─── 基础类型 ────────────────────────────────────────────────
type FaceName = 'U' | 'D' | 'F' | 'B' | 'L' | 'R';
type ColorName = 'white' | 'yellow' | 'green' | 'blue' | 'orange' | 'red';
interface CubeState { faces: Record<FaceName, ColorName[]>; }

const CUBE_FACES: FaceName[] = ['U', 'D', 'F', 'B', 'L', 'R'];

// ─── 颜色 → Kociemba 面字母映射 ────────────────────────────
// U=yellow, D=white, F=green, B=blue, L=red, R=orange
const COLOR_TO_FACE: Record<ColorName, FaceName> = {
  yellow: 'U', white: 'D', green: 'F',
  blue: 'B', red: 'L', orange: 'R',
};

const FACE_ORDER: FaceName[] = ['U', 'R', 'F', 'D', 'L', 'B'];
const SOLVED_FACELET = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDLLLLLLLLLBBBBBBBBB';

// ─── CubeState → facelet string ─────────────────────────────
function cubeStateToFacelet(state: CubeState): string {
  let s = '';
  for (const f of FACE_ORDER) {
    for (let i = 0; i < 9; i++) {
      const color = state.faces[f][i] as ColorName;
      const face = COLOR_TO_FACE[color];
      s += face ?? '?';
    }
  }
  return s;
}

function cloneState(state: CubeState): CubeState {
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

const STATE_SIDE_STRIPS: Record<FaceName, { face: FaceName; indices: [number, number, number] }[]> = {
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

function applyNotationToState(state: CubeState, notation: string): CubeState {
  const s = cloneState(state);
  const face = notation[0] as FaceName;
  const double = notation.includes('2');
  const clockwise = double ? true : !notation.includes("'");
  const times = double ? 2 : 1;

  for (let t = 0; t < times; t++) {
    s.faces[face] = clockwise
      ? rotateFaceClockwise(s.faces[face])
      : rotateFaceCounterClockwise(s.faces[face]);

    const strips = STATE_SIDE_STRIPS[face];
    if (clockwise) {
      for (let i = 0; i < 3; i++) {
        const temp = s.faces[strips[3].face][strips[3].indices[i]];
        s.faces[strips[3].face][strips[3].indices[i]] = s.faces[strips[2].face][strips[2].indices[i]];
        s.faces[strips[2].face][strips[2].indices[i]] = s.faces[strips[1].face][strips[1].indices[i]];
        s.faces[strips[1].face][strips[1].indices[i]] = s.faces[strips[0].face][strips[0].indices[i]];
        s.faces[strips[0].face][strips[0].indices[i]] = temp;
      }
    } else {
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

function applyNotationsToState(state: CubeState, notations: string[]): CubeState {
  return notations.reduce((current, notation) => applyNotationToState(current, notation), state);
}

function isCubeStateSolved(state: CubeState): boolean {
  return CUBE_FACES.every(face => {
    const first = state.faces[face][0];
    return state.faces[face].every(color => color === first);
  });
}

// ─── 移动工具 ────────────────────────────────────────────────
function invertMove(notation: string): string {
  if (notation.includes('2')) return notation;
  if (notation.includes("'")) return notation.replace("'", '');
  return notation + "'";
}

function quarterTurns(m: string): number {
  if (m.includes('2')) return 2;
  if (m.includes("'")) return 3;
  return 1;
}

function optimizeSolution(solution: string[]): string[] {
  const result: string[] = [];
  for (const move of solution) {
    if (!result.length) { result.push(move); continue; }
    const last = result[result.length - 1];
    if (last[0] === move[0]) {
      const q = ((quarterTurns(last) + quarterTurns(move)) % 4 + 4) % 4;
      result.pop();
      if (q === 1) result.push(move[0]);
      else if (q === 2) result.push(move[0] + '2');
      else if (q === 3) result.push(move[0] + "'");
    } else {
      result.push(move);
    }
  }
  return result;
}

// ─── Kociemba 两阶段算法 ─────────────────────────────────────
// 角块/棱块基本类型
type CornerMove = { perm: number[]; twist: number[] };
type EdgeMove   = { perm: number[]; flip:  number[] };

interface CubieCube {
  cp: number[]; co: number[];
  ep: number[]; eo: number[];
}

const N_TWIST    = 2187;
const N_FLIP     = 2048;
const N_UDSLICE  = 495;
const N_CORNERS  = 40320;
const N_EDGES8   = 40320;
const N_UDSLICE2 = 24;
const N_MOVES    = 18;

const MOVE_NOTATIONS = [
  'U','U2',"U'",'R','R2',"R'",'F','F2',"F'",
  'D','D2',"D'",'L','L2',"L'",'B','B2',"B'"
];

// 角块移动数据
const CORNER_MOVES: CornerMove[] = [
  { perm:[3,0,1,2,4,5,6,7], twist:[0,0,0,0,0,0,0,0] }, // U
  { perm:[2,3,0,1,4,5,6,7], twist:[0,0,0,0,0,0,0,0] }, // U2
  { perm:[1,2,3,0,4,5,6,7], twist:[0,0,0,0,0,0,0,0] }, // U'
  { perm:[4,1,2,0,7,5,6,3], twist:[2,0,0,1,1,0,0,2] }, // R
  { perm:[7,1,2,4,3,5,6,0], twist:[0,0,0,0,0,0,0,0] }, // R2
  { perm:[3,1,2,7,0,5,6,4], twist:[2,0,0,1,1,0,0,2] }, // R'
  { perm:[1,5,2,3,0,4,6,7], twist:[1,2,0,0,2,1,0,0] }, // F
  { perm:[5,4,2,3,1,0,6,7], twist:[0,0,0,0,0,0,0,0] }, // F2
  { perm:[4,0,2,3,5,1,6,7], twist:[1,2,0,0,2,1,0,0] }, // F'
  { perm:[0,1,2,3,5,6,7,4], twist:[0,0,0,0,0,0,0,0] }, // D
  { perm:[0,1,2,3,6,7,4,5], twist:[0,0,0,0,0,0,0,0] }, // D2
  { perm:[0,1,2,3,7,4,5,6], twist:[0,0,0,0,0,0,0,0] }, // D'
  { perm:[0,2,6,3,4,1,5,7], twist:[0,1,2,0,0,2,1,0] }, // L
  { perm:[0,6,5,3,4,2,1,7], twist:[0,0,0,0,0,0,0,0] }, // L2
  { perm:[0,5,1,3,4,6,2,7], twist:[0,1,2,0,0,2,1,0] }, // L'
  { perm:[0,1,3,7,4,5,2,6], twist:[0,0,1,2,0,0,2,1] }, // B
  { perm:[0,1,7,6,4,5,3,2], twist:[0,0,0,0,0,0,0,0] }, // B2
  { perm:[0,1,6,2,4,5,7,3], twist:[0,0,1,2,0,0,2,1] }, // B'
];

// 棱块移动数据（D移动已修正）
const EDGE_MOVES: EdgeMove[] = [
  { perm:[3,0,1,2,4,5,6,7,8,9,10,11], flip:[0,0,0,0,0,0,0,0,0,0,0,0] }, // U
  { perm:[2,3,0,1,4,5,6,7,8,9,10,11], flip:[0,0,0,0,0,0,0,0,0,0,0,0] }, // U2
  { perm:[1,2,3,0,4,5,6,7,8,9,10,11], flip:[0,0,0,0,0,0,0,0,0,0,0,0] }, // U'
  { perm:[8,1,2,3,11,5,6,7,0,9,10,4], flip:[0,0,0,0,0,0,0,0,0,0,0,0] }, // R
  { perm:[0,1,2,3,8,5,6,7,4,9,10,11], flip:[0,0,0,0,0,0,0,0,0,0,0,0] }, // R2
  { perm:[4,1,2,3,11,5,6,7,8,9,10,0], flip:[0,0,0,0,0,0,0,0,0,0,0,0] }, // R'
  { perm:[0,8,2,3,4,9,6,7,5,1,10,11], flip:[0,1,0,0,0,1,0,0,1,1,0,0] }, // F
  { perm:[0,5,2,3,4,1,6,7,9,8,10,11], flip:[0,0,0,0,0,0,0,0,0,0,0,0] }, // F2
  { perm:[0,9,2,3,4,8,6,7,1,5,10,11], flip:[0,1,0,0,0,1,0,0,1,1,0,0] }, // F'
  { perm:[0,1,2,3,7,4,5,6,8,9,10,11], flip:[0,0,0,0,0,0,0,0,0,0,0,0] }, // D （已修正）
  { perm:[0,1,2,3,6,7,4,5,8,9,10,11], flip:[0,0,0,0,0,0,0,0,0,0,0,0] }, // D2
  { perm:[0,1,2,3,5,6,7,4,8,9,10,11], flip:[0,0,0,0,0,0,0,0,0,0,0,0] }, // D'
  { perm:[0,1,9,3,4,5,10,7,8,6,2,11], flip:[0,0,0,0,0,0,0,0,0,0,0,0] }, // L
  { perm:[0,1,6,3,4,5,2,7,8,10,9,11], flip:[0,0,0,0,0,0,0,0,0,0,0,0] }, // L2
  { perm:[0,1,10,3,4,5,9,7,8,2,6,11], flip:[0,0,0,0,0,0,0,0,0,0,0,0] }, // L'
  { perm:[0,1,2,11,4,5,6,10,8,9,3,7], flip:[0,0,0,1,0,0,0,1,0,0,1,1] }, // B
  { perm:[0,1,2,7,4,5,6,3,8,9,11,10], flip:[0,0,0,0,0,0,0,0,0,0,0,0] }, // B2
  { perm:[0,1,2,10,4,5,6,11,8,9,7,3], flip:[0,0,0,1,0,0,0,1,0,0,1,1] }, // B'
];

// ─── 预计算表（懒加载）────────────────────────────────────────
let twistMoveTable:   Int16Array;
let flipMoveTable:    Int16Array;
let udSliceMoveTable: Int16Array;
let cornersMoveTable: Int32Array;
let edges8MoveTable:  Int32Array;
let udSlice2MoveTable: Int8Array;
let twistPruneTable:   Int8Array;
let flipUdSlicePruneTable: Int8Array;
let phase2PruneTable:  Int8Array;
let tablesReady = false;
let cubeJsReady = false;

// ─── CubieCube 工具 ──────────────────────────────────────────
function solvedCubie(): CubieCube {
  return {
    cp: [0,1,2,3,4,5,6,7],
    co: [0,0,0,0,0,0,0,0],
    ep: [0,1,2,3,4,5,6,7,8,9,10,11],
    eo: [0,0,0,0,0,0,0,0,0,0,0,0],
  };
}

function cloneCubie(cc: CubieCube): CubieCube {
  return { cp:[...cc.cp], co:[...cc.co], ep:[...cc.ep], eo:[...cc.eo] };
}

function applyCubieMove(cc: CubieCube, m: number): CubieCube {
  const cm = CORNER_MOVES[m];
  const em = EDGE_MOVES[m];
  const ncp = Array(8).fill(0);
  const nco = Array(8).fill(0);
  const nep = Array(12).fill(0);
  const neo = Array(12).fill(0);
  for (let i = 0; i < 8; i++) {
    ncp[i] = cc.cp[cm.perm[i]];
    nco[i] = (cc.co[cm.perm[i]] + cm.twist[i]) % 3;
  }
  for (let i = 0; i < 12; i++) {
    nep[i] = cc.ep[em.perm[i]];
    neo[i] = (cc.eo[em.perm[i]] + em.flip[i]) % 2;
  }
  return { cp: ncp, co: nco, ep: nep, eo: neo };
}

// ─── 坐标函数 ────────────────────────────────────────────────
function getTwist(cc: CubieCube): number {
  let v = 0;
  for (let i = 0; i < 7; i++) v = v * 3 + cc.co[i];
  return v;
}

function getFlip(cc: CubieCube): number {
  let v = 0;
  for (let i = 0; i < 11; i++) v = v * 2 + cc.eo[i];
  return v;
}

function cnk(n: number, k: number): number {
  if (n < k || k < 0) return 0;
  if (k > n/2) k = n - k;
  let r = 1;
  for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
  return Math.round(r);
}

function getUdSlice(cc: CubieCube): number {
  let a = 0, x = 0;
  for (let j = 11; j >= 0; j--) {
    if (cc.ep[j] >= 8) { a += cnk(11 - j, x + 1); x++; }
  }
  return a;
}

function rotLeft(arr: number[], l: number, r: number) {
  const t = arr[l];
  for (let i = l; i < r; i++) arr[i] = arr[i+1];
  arr[r] = t;
}

function getCornerCoord(cc: CubieCube): number {
  const p = [...cc.cp];
  let s = 0;
  for (let i = 7; i > 0; i--) {
    let k = 0;
    while (p[i] !== i) { rotLeft(p, 0, i); k++; }
    s = (s + k) * i;
  }
  return s;
}

function getEdge8Coord(cc: CubieCube): number {
  const p = cc.ep.slice(0, 8);
  let s = 0;
  for (let i = 7; i > 0; i--) {
    let k = 0;
    while (p[i] !== i) { rotLeft(p, 0, i); k++; }
    s = (s + k) * i;
  }
  return s;
}

function getUdSlice2Coord(cc: CubieCube): number {
  const sl = [cc.ep[8]-8, cc.ep[9]-8, cc.ep[10]-8, cc.ep[11]-8];
  let s = 0;
  for (let i = 3; i > 0; i--) {
    let k = 0;
    while (sl[i] !== i) { rotLeft(sl, 0, i); k++; }
    s = (s + k) * i;
  }
  return s;
}

// ─── 坐标设置（用于表构建）────────────────────────────────────
function setTwist(cc: CubieCube, twist: number): CubieCube {
  let s = 0;
  for (let i = 6; i >= 0; i--) { cc.co[i] = twist % 3; twist = Math.floor(twist / 3); s += cc.co[i]; }
  cc.co[7] = (3 - s % 3) % 3;
  return cc;
}

function setFlip(cc: CubieCube, flip: number): CubieCube {
  let s = 0;
  for (let i = 10; i >= 0; i--) { cc.eo[i] = flip % 2; flip = Math.floor(flip / 2); s += cc.eo[i]; }
  cc.eo[11] = s % 2;
  return cc;
}

function setUdSlice(cc: CubieCube, sl: number): CubieCube {
  const positions: boolean[] = Array(12).fill(false);
  let x = 3;
  for (let j = 11; j >= 0 && x >= 0; j--) {
    const c = cnk(11 - j, x + 1);
    if (sl >= c) { sl -= c; positions[j] = true; x--; }
  }
  let slIdx = 8, nonSlIdx = 0;
  for (let i = 0; i < 12; i++) {
    if (positions[i]) cc.ep[i] = slIdx++;
    else cc.ep[i] = nonSlIdx++;
  }
  return cc;
}

function setCorners(cc: CubieCube, coord: number): CubieCube {
  cc.cp = [0,1,2,3,4,5,6,7];
  for (let i = 1; i < 8; i++) {
    const k = coord % (i + 1);
    coord = Math.floor(coord / (i + 1));
    for (let j = 0; j < k; j++) {
      const t = cc.cp[i];
      for (let l = i; l > 0; l--) cc.cp[l] = cc.cp[l-1];
      cc.cp[0] = t;
    }
  }
  return cc;
}

function setEdge8(cc: CubieCube, coord: number): CubieCube {
  for (let i = 1; i < 8; i++) {
    const k = coord % (i + 1);
    coord = Math.floor(coord / (i + 1));
    for (let j = 0; j < k; j++) {
      const t = cc.ep[i];
      for (let l = i; l > 0; l--) cc.ep[l] = cc.ep[l-1];
      cc.ep[0] = t;
    }
  }
  return cc;
}

function setUdSlice2(cc: CubieCube, coord: number): CubieCube {
  const sl = [8,9,10,11];
  for (let i = 1; i < 4; i++) {
    const k = coord % (i + 1);
    coord = Math.floor(coord / (i + 1));
    for (let j = 0; j < k; j++) {
      const t = sl[i];
      for (let l = i; l > 0; l--) sl[l] = sl[l-1];
      sl[0] = t;
    }
  }
  cc.ep[8] = sl[0]; cc.ep[9] = sl[1]; cc.ep[10] = sl[2]; cc.ep[11] = sl[3];
  return cc;
}

// ─── facelet → CubieCube ─────────────────────────────────────
function faceChar(c: string): number {
  return 'URFDLB'.indexOf(c);
}

const CORNER_FACELETS = [
  [8,9,20],[6,18,38],[0,36,47],[2,45,11],
  [29,26,15],[27,24,44],[33,53,42],[35,17,51]
];
const CORNER_COLORS = [
  [0,1,2],[0,2,4],[0,4,5],[0,5,1],
  [3,2,1],[3,4,2],[3,5,4],[3,1,5]
];
const EDGE_FACELETS = [
  [5,10],[7,19],[3,37],[1,46],
  [32,16],[28,25],[30,43],[34,52],
  [23,12],[21,41],[50,39],[48,14]
];
const EDGE_COLORS = [
  [0,1],[0,2],[0,4],[0,5],
  [3,1],[3,2],[3,4],[3,5],
  [2,1],[2,4],[5,4],[5,1]
];

function faceletToCubieCube(facelet: string): CubieCube | null {
  const f = facelet.split('').map(faceChar);
  const cp = Array(8).fill(0);
  const co = Array(8).fill(0);
  const ep = Array(12).fill(0);
  const eo = Array(12).fill(0);

  for (let i = 0; i < 8; i++) {
    const ff = CORNER_FACELETS[i];
    const colors = [f[ff[0]], f[ff[1]], f[ff[2]]];
    let found = false;
    for (let j = 0; j < 8; j++) {
      for (let ori = 0; ori < 3; ori++) {
        const cc = CORNER_COLORS[j];
        if (colors[0]===cc[ori%3] && colors[1]===cc[(ori+1)%3] && colors[2]===cc[(ori+2)%3]) {
          cp[i] = j; co[i] = ori; found = true; break;
        }
      }
      if (found) break;
    }
    if (!found) return null;
  }

  for (let i = 0; i < 12; i++) {
    const ff = EDGE_FACELETS[i];
    const colors = [f[ff[0]], f[ff[1]]];
    let found = false;
    for (let j = 0; j < 12; j++) {
      const ec = EDGE_COLORS[j];
      if (colors[0]===ec[0] && colors[1]===ec[1]) { ep[i]=j; eo[i]=0; found=true; break; }
      if (colors[0]===ec[1] && colors[1]===ec[0]) { ep[i]=j; eo[i]=1; found=true; break; }
    }
    if (!found) return null;
  }

  return { cp, co, ep, eo };
}

function permutationParity(values: number[]): number {
  let parity = 0;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (values[i] > values[j]) parity ^= 1;
    }
  }
  return parity;
}

function hasAllPieces(values: number[], count: number): boolean {
  const seen = new Set(values);
  for (let i = 0; i < count; i++) {
    if (!seen.has(i)) return false;
  }
  return seen.size === count;
}

function isSolvableCubie(cc: CubieCube): boolean {
  if (!hasAllPieces(cc.cp, 8) || !hasAllPieces(cc.ep, 12)) return false;
  if (cc.co.reduce((sum, v) => sum + v, 0) % 3 !== 0) return false;
  if (cc.eo.reduce((sum, v) => sum + v, 0) % 2 !== 0) return false;
  return permutationParity(cc.cp) === permutationParity(cc.ep);
}

function cubeJsFaceletToCubie(facelet: string): CubieCube | null {
  try {
    const json = Cube.fromString(facelet).toJSON();
    return {
      cp: [...json.cp],
      co: [...json.co],
      ep: [...json.ep],
      eo: [...json.eo],
    };
  } catch {
    return null;
  }
}

const SHORT_SOLVE_MOVES = [
  'U', 'U2', "U'",
  'R', 'R2', "R'",
  'F', 'F2', "F'",
  'D', 'D2', "D'",
  'L', 'L2', "L'",
  'B', 'B2', "B'",
];

const OPPOSITE_FACE: Record<string, string> = {
  U: 'D', D: 'U',
  F: 'B', B: 'F',
  L: 'R', R: 'L',
};

function findShortSolution(facelet: string, maxDepth = 5, timeLimitMs = 1200): string[] | null {
  const start = Cube.fromString(facelet);
  if (start.isSolved()) return [];

  const deadline = Date.now() + timeLimitMs;
  const path: string[] = [];

  function dfs(cube: any, remaining: number, lastFace: string, prevFace: string, seen: Set<string>): boolean {
    if (Date.now() > deadline) return false;
    if (remaining === 0) return cube.isSolved();

    for (const move of SHORT_SOLVE_MOVES) {
      const face = move[0];
      if (face === lastFace) continue;
      if (lastFace && face === OPPOSITE_FACE[lastFace] && prevFace === face) continue;

      const next = cube.clone();
      next.move(move);
      const key = next.asString();
      if (seen.has(key)) continue;

      path.push(move);
      if (next.isSolved()) return true;

      seen.add(key);
      if (dfs(next, remaining - 1, face, lastFace, seen)) return true;
      seen.delete(key);
      path.pop();
    }

    return false;
  }

  for (let depth = 1; depth <= maxDepth && Date.now() <= deadline; depth++) {
    path.length = 0;
    const seen = new Set<string>([start.asString()]);
    if (dfs(start, depth, '', '', seen)) return [...path];
  }

  return null;
}

function solveWithCubeJs(facelet: string): string[] {
  if (!cubeJsReady) {
    self.postMessage({ type: 'progress', message: '正在初始化 Kociemba 求解器，首次约需数秒...' });
    Cube.initSolver();
    cubeJsReady = true;
  }

  const cube = Cube.fromString(facelet);
  const solution = cube.solve(22) as string;
  return solution.trim() ? solution.trim().split(/\s+/) : [];
}

function applyMovesToFacelet(facelet: string, moves: string[]): string | null {
  try {
    const cube = Cube.fromString(facelet);
    if (moves.length > 0) cube.move(moves.join(' '));
    return cube.asString();
  } catch {
    return null;
  }
}

function solveFaceletBestEffort(facelet: string): { solution: string[]; algorithm: string } {
  const shortSolution = findShortSolution(facelet);
  if (shortSolution !== null) {
    const solution = optimizeSolution(shortSolution);
    return { solution, algorithm: `短解优先搜索（${solution.length} 步）` };
  }

  const solution = optimizeSolution(solveWithCubeJs(facelet));
  return { solution, algorithm: `Kociemba 两阶段算法（${solution.length} 步）` };
}

// ─── 移动表构建（懒加载）─────────────────────────────────────
function buildTwistMoveTable(): Int16Array {
  const t = new Int16Array(N_TWIST * N_MOVES);
  const base = solvedCubie();
  for (let twist = 0; twist < N_TWIST; twist++) {
    const cc = setTwist(cloneCubie(base), twist);
    for (let m = 0; m < N_MOVES; m++) t[twist * N_MOVES + m] = getTwist(applyCubieMove(cc, m));
  }
  return t;
}

function buildFlipMoveTable(): Int16Array {
  const t = new Int16Array(N_FLIP * N_MOVES);
  const base = solvedCubie();
  for (let flip = 0; flip < N_FLIP; flip++) {
    const cc = setFlip(cloneCubie(base), flip);
    for (let m = 0; m < N_MOVES; m++) t[flip * N_MOVES + m] = getFlip(applyCubieMove(cc, m));
  }
  return t;
}

function buildUdSliceMoveTable(): Int16Array {
  const t = new Int16Array(N_UDSLICE * N_MOVES);
  const base = solvedCubie();
  for (let s = 0; s < N_UDSLICE; s++) {
    const cc = setUdSlice(cloneCubie(base), s);
    for (let m = 0; m < N_MOVES; m++) t[s * N_MOVES + m] = getUdSlice(applyCubieMove(cc, m));
  }
  return t;
}

function buildCornersMoveTable(): Int32Array {
  const t = new Int32Array(N_CORNERS * N_MOVES);
  const base = solvedCubie();
  for (let c = 0; c < N_CORNERS; c++) {
    const cc = setCorners(cloneCubie(base), c);
    for (let m = 0; m < N_MOVES; m++) t[c * N_MOVES + m] = getCornerCoord(applyCubieMove(cc, m));
  }
  return t;
}

function buildEdge8MoveTable(): Int32Array {
  const t = new Int32Array(N_EDGES8 * N_MOVES);
  const base = solvedCubie();
  for (let e = 0; e < N_EDGES8; e++) {
    const cc = setEdge8(cloneCubie(base), e);
    for (let m = 0; m < N_MOVES; m++) t[e * N_MOVES + m] = getEdge8Coord(applyCubieMove(cc, m));
  }
  return t;
}

function buildUdSlice2MoveTable(): Int8Array {
  const t = new Int8Array(N_UDSLICE2 * N_MOVES);
  const base = solvedCubie();
  for (let s = 0; s < N_UDSLICE2; s++) {
    const cc = setUdSlice2(cloneCubie(base), s);
    for (let m = 0; m < N_MOVES; m++) t[s * N_MOVES + m] = getUdSlice2Coord(applyCubieMove(cc, m));
  }
  return t;
}

function buildTwistPruneTable(): Int8Array {
  const t = new Int8Array(N_TWIST * N_UDSLICE).fill(-1);
  t[0] = 0;
  let done = 1;
  let depth = 0;
  while (done < N_TWIST * N_UDSLICE) {
    for (let i = 0; i < N_TWIST * N_UDSLICE; i++) {
      if (t[i] !== depth) continue;
      const tw = Math.floor(i / N_UDSLICE);
      const sl = i % N_UDSLICE;
      for (let m = 0; m < N_MOVES; m++) {
        const ni = twistMoveTable[tw * N_MOVES + m] * N_UDSLICE + udSliceMoveTable[sl * N_MOVES + m];
        if (t[ni] === -1) { t[ni] = depth + 1; done++; }
      }
    }
    depth++;
    if (depth > 20) break;
  }
  return t;
}

function buildFlipUdSlicePruneTable(): Int8Array {
  const t = new Int8Array(N_FLIP * N_UDSLICE).fill(-1);
  t[0] = 0;
  let done = 1;
  let depth = 0;
  while (done < N_FLIP * N_UDSLICE) {
    for (let i = 0; i < N_FLIP * N_UDSLICE; i++) {
      if (t[i] !== depth) continue;
      const fl = Math.floor(i / N_UDSLICE);
      const sl = i % N_UDSLICE;
      for (let m = 0; m < N_MOVES; m++) {
        const ni = flipMoveTable[fl * N_MOVES + m] * N_UDSLICE + udSliceMoveTable[sl * N_MOVES + m];
        if (t[ni] === -1) { t[ni] = depth + 1; done++; }
      }
    }
    depth++;
    if (depth > 20) break;
  }
  return t;
}

function buildPhase2PruneTable(): Int8Array {
  const SIZE = N_CORNERS * N_UDSLICE2;
  const t = new Int8Array(SIZE).fill(-1);
  t[0] = 0;
  let done = 1;
  let depth = 0;
  const P2_MOVES = [0,1,2,9,10,11,4,13,7,16];
  while (done < SIZE) {
    for (let i = 0; i < SIZE; i++) {
      if (t[i] !== depth) continue;
      const co = Math.floor(i / N_UDSLICE2);
      const sl = i % N_UDSLICE2;
      for (const m of P2_MOVES) {
        const ni = cornersMoveTable[co * N_MOVES + m] * N_UDSLICE2 + udSlice2MoveTable[sl * N_MOVES + m];
        if (t[ni] === -1) { t[ni] = depth + 1; done++; }
      }
    }
    depth++;
    if (depth > 20) break;
  }
  return t;
}

function initTables(): void {
  if (tablesReady) return;
  self.postMessage({ type: 'progress', message: '后台正在初始化 Kociemba 求解器（约需 3-5 秒）...' });
  twistMoveTable    = buildTwistMoveTable();
  flipMoveTable     = buildFlipMoveTable();
  udSliceMoveTable  = buildUdSliceMoveTable();
  self.postMessage({ type: 'progress', message: '后台构建移动表：corners（最慢步骤）...' });
  cornersMoveTable  = buildCornersMoveTable();
  self.postMessage({ type: 'progress', message: '后台构建移动表：edges8...' });
  edges8MoveTable   = buildEdge8MoveTable();
  udSlice2MoveTable = buildUdSlice2MoveTable();
  self.postMessage({ type: 'progress', message: '后台构建剪枝表...' });
  twistPruneTable        = buildTwistPruneTable();
  flipUdSlicePruneTable  = buildFlipUdSlicePruneTable();
  phase2PruneTable       = buildPhase2PruneTable();
  tablesReady = true;
  self.postMessage({ type: 'progress', message: 'Kociemba 求解器就绪，下次求解将使用最优算法' });
}

// ─── IDA* 两阶段搜索 ──────────────────────────────────────────
const P1_MOVES = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17];
const P2_MOVES = [0,1,2,9,10,11,4,13,7,16];
const OPPOSITE: number[] = [3, 4, 5, 0, 1, 2]; // U↔D, R↔L, F↔B

let solveAborted = false;
let solveDeadline = 0;

function searchP1(
  twist: number, flip: number, udSlice: number,
  depth: number, limit: number, path: number[], lastMove: number
): boolean {
  if (Date.now() > solveDeadline) { solveAborted = true; return false; }
  const h = Math.max(
    twistPruneTable[twist * N_UDSLICE + udSlice],
    flipUdSlicePruneTable[flip * N_UDSLICE + udSlice]
  );
  if (depth + h > limit) return false;
  if (twist === 0 && flip === 0 && udSlice === 0) return true;
  if (depth === limit) return false;

  const lastFace = lastMove >= 0 ? Math.floor(lastMove / 3) : -1;
  for (const m of P1_MOVES) {
    if (solveAborted) return false;
    const face = Math.floor(m / 3);
    if (face === lastFace) continue;
    if (path.length >= 2 && lastFace >= 0 && face === OPPOSITE[lastFace]) {
      const prevFace = Math.floor(path[path.length - 2] / 3);
      if (prevFace === face) continue;
    }
    const ntw = twistMoveTable[twist * N_MOVES + m];
    const nfl = flipMoveTable[flip * N_MOVES + m];
    const nsl = udSliceMoveTable[udSlice * N_MOVES + m];
    path.push(m);
    if (searchP1(ntw, nfl, nsl, depth + 1, limit, path, m)) return true;
    path.pop();
  }
  return false;
}

function searchP2(
  corners: number, edges8: number, udSlice2: number,
  depth: number, limit: number, path: number[], lastMove: number
): boolean {
  if (Date.now() > solveDeadline) { solveAborted = true; return false; }
  const h = phase2PruneTable[corners * N_UDSLICE2 + udSlice2];
  if (depth + h > limit) return false;
  if (corners === 0 && edges8 === 0 && udSlice2 === 0) return true;
  if (depth === limit) return false;

  const lastFace = lastMove >= 0 ? Math.floor(lastMove / 3) : -1;
  for (const m of P2_MOVES) {
    if (solveAborted) return false;
    const face = Math.floor(m / 3);
    if (face === lastFace) continue;
    const nc = cornersMoveTable[corners * N_MOVES + m];
    const ne = edges8MoveTable[edges8 * N_MOVES + m];
    const ns = udSlice2MoveTable[udSlice2 * N_MOVES + m];
    path.push(m);
    if (searchP2(nc, ne, ns, depth + 1, limit, path, m)) return true;
    path.pop();
  }
  return false;
}

function kociembaSolve(facelet: string, timeoutMs: number): string[] | null {
  const cc = faceletToCubieCube(facelet);
  if (!cc) return null;

  solveAborted = false;
  solveDeadline = Date.now() + timeoutMs;

  const twist = getTwist(cc);
  const flip  = getFlip(cc);
  const udSlice = getUdSlice(cc);

  for (let p1max = 0; p1max <= 12 && !solveAborted; p1max++) {
    const p1path: number[] = [];
    if (!searchP1(twist, flip, udSlice, 0, p1max, p1path, -1)) continue;

    let cc2 = cloneCubie(cc);
    for (const m of p1path) cc2 = applyCubieMove(cc2, m);

    const corners  = getCornerCoord(cc2);
    const edges8   = getEdge8Coord(cc2);
    const udSlice2 = getUdSlice2Coord(cc2);

    const p2path: number[] = [];
    for (let limit = 0; limit <= 18 - p1max && !solveAborted; limit++) {
      if (searchP2(corners, edges8, udSlice2, 0, limit, p2path, -1)) {
        return [...p1path, ...p2path].map(i => MOVE_NOTATIONS[i]);
      }
    }
  }
  return null;
}

// ─── Worker 消息处理 ─────────────────────────────────────────
self.onmessage = (e: MessageEvent) => {
  const { type, cubeState, moveHistory, timeoutMs } = e.data;

  // 仅预热（页面加载后调用）
  if (type === 'init') {
    // 不在 init 时构建大表，等 solve 时再按需构建
    self.postMessage({ type: 'ready' });
    return;
  }

  if (type === 'solve') {
    const startTime = Date.now();
    const timeout = timeoutMs ?? 30000;
    const facelet = cubeStateToFacelet(cubeState as CubeState);
    const validChars = new Set(['U','R','F','D','L','B']);
    const isValidFacelet =
      facelet.length === 54 &&
      [...facelet].every(c => validChars.has(c)) &&
      ['U','R','F','D','L','B'].every(c => facelet.split('').filter(x => x === c).length === 9);

    // ── 轨道1：立即响应（历史逆序）────────────────────────────
    // 有历史记录时先尝试撤销历史；若撤销后仍未还原，再接上自动求解。
    if (moveHistory && (moveHistory as string[]).length > 0) {
      const quickSolution = optimizeSolution(
        (moveHistory as string[]).slice().reverse().map(invertMove)
      );

      if (!isValidFacelet) {
        self.postMessage({
          type: 'solution',
          solution: quickSolution,
          nodesSearched: 0,
          timeMs: Date.now() - startTime,
          verified: false,
          algorithm: '历史逆序（未校验）',
        });
        return;
      }

      const afterHistoryState = applyNotationsToState(cubeState as CubeState, quickSolution);

      if (isCubeStateSolved(afterHistoryState)) {
        self.postMessage({
          type: 'solution',
          solution: quickSolution,
          nodesSearched: 0,
          timeMs: Date.now() - startTime,
          verified: true,
          algorithm: '历史逆序（已还原）',
        });
        return;
      }

      try {
        const afterHistoryFacelet = cubeStateToFacelet(afterHistoryState);
        const parsedAfterHistory = cubeJsFaceletToCubie(afterHistoryFacelet);
        if (!parsedAfterHistory || !isSolvableCubie(parsedAfterHistory)) {
          self.postMessage({ type: 'error', message: '撤销操作历史后，魔方颜色组合仍不合法，无法继续自动求解。' });
          return;
        }

        const tail = solveFaceletBestEffort(afterHistoryFacelet);
        const solution = optimizeSolution([...quickSolution, ...tail.solution]);
        self.postMessage({
          type: 'solution',
          solution,
          nodesSearched: 0,
          timeMs: Date.now() - startTime,
          verified: true,
          algorithm: `历史逆序 + ${tail.algorithm}`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知错误';
        self.postMessage({ type: 'error', message: `历史逆序后继续求解失败：${message}` });
      }
      return;
    }

    // ── 验证 facelet ──────────────────────────────────────────
    if (!isValidFacelet) {
      // 颜色格式错误，只能用历史逆序（已经发出了）
      if (!moveHistory || (moveHistory as string[]).length === 0) {
        self.postMessage({ type: 'error', message: '魔方颜色格式错误，无法求解。请确保颜色名称正确。' });
      }
      return;
    }

    // 已还原
    if (facelet === SOLVED_FACELET) {
      self.postMessage({ type: 'solution', solution: [], nodesSearched: 0, timeMs: 0, verified: true, algorithm: 'Kociemba两阶段' });
      return;
    }

    const parsedCubie = cubeJsFaceletToCubie(facelet);
    if (!parsedCubie || !isSolvableCubie(parsedCubie)) {
      self.postMessage({ type: 'error', message: '魔方颜色组合不合法，无法求解。请检查中心块方向、每种颜色 9 次，以及角块/棱块是否录入正确。' });
      return;
    }

    try {
      const result = solveFaceletBestEffort(facelet);
      self.postMessage({
        type: 'solution',
        solution: result.solution,
        nodesSearched: 0,
        timeMs: Date.now() - startTime,
        verified: true,
        algorithm: result.algorithm,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      self.postMessage({ type: 'error', message: `自动求解失败：${message}` });
    }
    return;

    const remaining = timeout - (Date.now() - startTime);
    if (remaining < 500) {
      self.postMessage({ type: 'error', message: '求解超时，请重试。' });
      return;
    }

    const solution = kociembaSolve(facelet, remaining);
    if (solution !== null) {
      const optimized = optimizeSolution(solution);
      const historyLen = moveHistory ? (moveHistory as string[]).length : Infinity;
      if (optimized.length < historyLen) {
        self.postMessage({
          type: 'solution',
          solution: optimized,
          nodesSearched: 0,
          timeMs: Date.now() - startTime,
          verified: true,
          algorithm: `Kociemba两阶段（${optimized.length}步，已优化）`,
        });
      }
    } else {
      // ★ 修复：Kociemba 失败时（facelet解析失败或搜索超时）必须发出错误，
      // 否则 isSolverWorking 永远为 true，界面永远显示"求解中"
      self.postMessage({ type: 'error', message: '自动求解失败，颜色输入可能存在错误。请检查每种颜色各出现9次。' });
    }
  }
};
