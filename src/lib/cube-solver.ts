import type { CubeState, FaceName } from '@/lib/cube-model';
import { isSolved } from '@/lib/cube-model';

// 生成解法：交给 Worker 运行 Kociemba 算法
// 此文件保留辅助函数，实际求解在 solver-worker.ts 中完成

export function invertMove(notation: string): string {
  if (notation.includes('2')) return notation;
  if (notation.includes("'")) return notation.replace("'", '');
  return notation + "'";
}

export function checkSolved(state: CubeState): boolean {
  return isSolved(state);
}

// 视觉调试用：输出面展示
export function getFaceDisplay(state: CubeState): string {
  const faceNames: FaceName[] = ['U', 'L', 'F', 'R', 'B', 'D'];
  const colorSymbols: Record<string, string> = {
    white: '⬜', yellow: '🟨', green: '🟩',
    blue: '🟦', orange: '🟧', red: '🟥',
  };
  let display = '';
  for (const face of faceNames) {
    display += `${face}: `;
    for (let i = 0; i < 9; i++) {
      if (i > 0 && i % 3 === 0) display += '\n   ';
      display += colorSymbols[state.faces[face][i]] ?? '?';
    }
    display += '\n\n';
  }
  return display;
}