import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Dices, Zap, RotateCcw, Play, SkipForward } from 'lucide-react';

// 魔方状态管理
type FaceName = 'U' | 'D' | 'F' | 'B' | 'L' | 'R';
type ColorName = 'yellow' | 'white' | 'green' | 'blue' | 'red' | 'orange';
const FACES: FaceName[] = ['U', 'D', 'F', 'B', 'L', 'R'];

// 面对应的颜色名称（用于 solver-worker 识别）
const FACE_COLOR_NAMES: Record<FaceName, ColorName> = {
  U: 'yellow', D: 'white', F: 'green',
  B: 'blue',   L: 'red',   R: 'orange',
};

// 颜色名称 → HEX（仅用于画布渲染）
const COLOR_HEX: Record<ColorName, string> = {
  yellow: '#FFD500', white: '#FFFFFF', green: '#009E60',
  blue:   '#0051BA', red:   '#FF5800', orange: '#C41E3A',
};

const FACE_NAMES_CN: Record<FaceName, string> = {
  U: '上', D: '下', F: '前', B: '后', L: '左', R: '右'
};

interface CubeState {
  faces: Record<FaceName, ColorName[]>;
}

function createSolvedCube(): CubeState {
  const faces = {} as Record<FaceName, ColorName[]>;
  FACES.forEach(f => faces[f] = Array(9).fill(FACE_COLOR_NAMES[f]));
  return { faces };
}

function cloneState(state: CubeState): CubeState {
  const faces = {} as Record<FaceName, ColorName[]>;
  FACES.forEach(f => faces[f] = [...state.faces[f]]);
  return { faces };
}

function rotateFaceCW(face: ColorName[]): ColorName[] {
  return [face[6], face[3], face[0], face[7], face[4], face[1], face[8], face[5], face[2]];
}

function rotateFaceCCW(face: ColorName[]): ColorName[] {
  return [face[2], face[5], face[8], face[1], face[4], face[7], face[0], face[3], face[6]];
}

function swapStrips(faces: ColorName[][], indices: number[], direction: number) {
  for (let i = 0; i < 3; i++) {
    const vals = faces.map(f => f[indices[i]]);
    for (let j = 0; j < 4; j++) {
      faces[j][indices[i]] = vals[(j + (direction === 1 ? 3 : 1)) % 4];
    }
  }
}

function swapStripsCustom(
  strips: { face: FaceName; idx: number[] }[],
  cube: CubeState,
  direction: number
) {
  for (let i = 0; i < 3; i++) {
    const vals = strips.map(s => cube.faces[s.face][s.idx[i]]);
    for (let j = 0; j < 4; j++) {
      cube.faces[strips[j].face][strips[j].idx[i]] = vals[(j + (direction === 1 ? 3 : 1)) % 4];
    }
  }
}

function applyMove(state: CubeState, notation: string): CubeState {
  const s = cloneState(state);
  const face = notation[0] as FaceName;
  const isCCW = notation.includes("'");
  const isDouble = notation.includes('2');
  const times = isDouble ? 2 : 1;

  for (let t = 0; t < times; t++) {
    s.faces[face] = (isDouble || !isCCW) ? rotateFaceCW(s.faces[face]) : rotateFaceCCW(s.faces[face]);

    switch (face) {
      case 'U':
        // U顺时针（从上看）：F顶行→R顶行→B顶行→L顶行
        swapStrips([s.faces.F, s.faces.L, s.faces.B, s.faces.R], [0, 1, 2], !isCCW ? 1 : -1);
        break;
      case 'D':
        // D顺时针（从下看）：F底行→L底行→B底行→R底行
        swapStrips([s.faces.F, s.faces.R, s.faces.B, s.faces.L], [6, 7, 8], !isCCW ? 1 : -1);
        break;
      case 'F':
        // F顺时针（从前看）：U底行→R左列→D顶行(反)→L右列(反)
        swapStripsCustom([
          { face: 'U', idx: [6, 7, 8] }, { face: 'R', idx: [0, 3, 6] },
          { face: 'D', idx: [2, 1, 0] }, { face: 'L', idx: [8, 5, 2] }
        ], s, !isCCW ? 1 : -1);
        break;
      case 'B':
        // B顺时针（从后看）：U顶行(反)→L左列→D底行→R右列(反)
        swapStripsCustom([
          { face: 'U', idx: [2, 1, 0] }, { face: 'L', idx: [0, 3, 6] },
          { face: 'D', idx: [6, 7, 8] }, { face: 'R', idx: [8, 5, 2] }
        ], s, !isCCW ? 1 : -1);
        break;
      case 'L':
        // L顺时针（从左看）：U左列→F左列→D左列→B右列(反)
        // strips顺序[U,B,D,F]本身是逆序排列，dir不取反，两者抵消 = 正确
        swapStripsCustom([
          { face: 'U', idx: [0, 3, 6] }, { face: 'F', idx: [0, 3, 6] },
          { face: 'D', idx: [0, 3, 6] },  { face: 'B', idx: [8, 5, 2] }
        ], s, isCCW ? 1 : -1);
        break;
      case 'R':
        // R顺时针（从右看）：U右列→F右列→D右列→B左列(反)
        swapStripsCustom([
          { face: 'U', idx: [8, 5, 2] },{ face: 'B', idx: [0, 3, 6] } ,
          { face: 'D', idx: [8, 5, 2] }, { face: 'F', idx: [8, 5, 2] }
        ], s, !isCCW ? 1 : -1);
        break;
    }
  }
  return s;
}

function generateScramble(length = 20): string[] {
  const moves: string[] = [];
  let last = '';
  let secondLast = '';
  const opposites: Record<string, string> = { U: 'D', D: 'U', F: 'B', B: 'F', L: 'R', R: 'L' };

  for (let i = 0; i < length; i++) {
    let face: FaceName;
    do {
      face = FACES[Math.floor(Math.random() * 6)];
    } while (face === last || (face === secondLast && opposites[face] === last));
    const mod = ['', "'", '2'][Math.floor(Math.random() * 3)];
    moves.push(face + mod);
    secondLast = last;
    last = face;
  }
  return moves;
}

function invertMove(notation: string): string {
  if (notation.includes('2')) return notation;
  if (notation.includes("'")) return notation.replace("'", "");
  return notation + "'";
}

function isSolved(state: CubeState): boolean {
  return FACES.every(face => {
    const first = state.faces[face][0];
    return state.faces[face].every(c => c === first);
  });
}

// Canvas 渲染
function drawCubeOnCanvas(canvas: HTMLCanvasElement, state: CubeState) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cellSize = 32;
  const gap = 2;
  const faceSize = cellSize * 3 + gap * 2;
  const offsetX = 20;
  const offsetY = 15;

  const facePositions: Record<FaceName, { x: number; y: number }> = {
    U: { x: offsetX + faceSize, y: offsetY },
    L: { x: offsetX, y: offsetY + faceSize },
    F: { x: offsetX + faceSize, y: offsetY + faceSize },
    R: { x: offsetX + faceSize * 2, y: offsetY + faceSize },
    B: { x: offsetX + faceSize * 3, y: offsetY + faceSize },
    D: { x: offsetX + faceSize, y: offsetY + faceSize * 2 }
  };

  FACES.forEach(face => {
    const pos = facePositions[face];
    if (!pos) return;

    // 背景
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(pos.x - 4, pos.y - 4, faceSize + 8, faceSize + 8);

    // 标签
    ctx.fillStyle = '#888';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${FACE_NAMES_CN[face]} (${face})`, pos.x + faceSize / 2, pos.y - 6);

    // 3x3 色块
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        const x = pos.x + col * (cellSize + gap);
        const y = pos.y + row * (cellSize + gap);

        ctx.fillStyle = COLOR_HEX[state.faces[face][idx]] ?? '#888888';
        ctx.beginPath();
        roundRect(ctx, x, y, cellSize, cellSize, 3);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        roundRect(ctx, x, y, cellSize, cellSize, 3);
        ctx.stroke();
      }
    }
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default function RubiksCubeSolver() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [cubeState, setCubeState] = useState<CubeState>(createSolvedCube());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [scrambleMoves, setScrambleMoves] = useState<string[]>([]);
  const [solveMoves, setSolveMoves] = useState<string[]>([]);
  const [currentSolveIndex, setCurrentSolveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isScrambling, setIsScrambling] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [isSolverWorking, setIsSolverWorking] = useState(false);
  const [solverProgress, setSolverProgress] = useState('');

  // 初始化 Worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./solver-worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current.postMessage({ type: 'init' });
    workerRef.current.onmessage = (e) => {
      const { type, solution, message, timeMs, algorithm } = e.data;
      if (type === 'ready') {
        // Worker 已就绪，无需操作
      } else if (type === 'progress') {
        // 后台 Kociemba 初始化进度，静默显示（不阻断用户操作）
        setSolverProgress(message);
      } else if (type === 'solution') {
        // 可能收到多次 solution（历史逆序 + Kociemba优化）
        // 只有在解更短或当前未在播放时才更新
        setIsSolverWorking(false);
        setSolverProgress('');
        setSolveMoves(prev => {
          // 如果当前已在播放（currentSolveIndex > 0），不覆盖
          // 如果是首次出解或新解更短，则更新
          if (solution.length < prev.length || prev.length === 0) {
            setCurrentSolveIndex(0);
            setIsSolving(true);
            const label = algorithm ?? '求解器';
            const steps = solution.length === 0 ? '（已是还原状态）' : `${solution.length} 步（${timeMs}ms）`;
            toast.success(`${label}：${steps}`);
            return solution;
          }
          return prev;
        });
      } else if (type === 'error') {
        setIsSolverWorking(false);
        setSolverProgress('');
        toast.error(message);
      }
    };
    return () => { workerRef.current?.terminate(); };
  }, []);

  const drawCube = useCallback((state: CubeState) => {
    if (canvasRef.current) {
      drawCubeOnCanvas(canvasRef.current, state);
    }
  }, []);

  useEffect(() => {
    drawCube(cubeState);
  }, [cubeState, drawCube]);

  const applyMoveAsync = useCallback(async (notation: string, delay = 80): Promise<void> => {
    setCubeState(prev => {
      const next = applyMove(prev, notation);
      setTimeout(() => drawCube(next), 0);
      return next;
    });
    setMoveHistory(prev => [...prev, notation]);
    await new Promise(resolve => setTimeout(resolve, delay));
  }, [drawCube]);

  const handleScramble = useCallback(async () => {
    if (isScrambling || isSolving || isAnimating) return;
    const moves = generateScramble(20);
    setScrambleMoves(moves);
    setSolveMoves([]);
    setCurrentSolveIndex(0);
    setMoveHistory([]);
    setCubeState(createSolvedCube());
    setIsScrambling(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    for (const move of moves) {
      await applyMoveAsync(move, 60);
    }

    setIsScrambling(false);
    toast.success('魔方已打乱！');
  }, [isScrambling, isSolving, isAnimating, applyMoveAsync]);

  const handleSolve = useCallback(() => {
    if (isSolving || isScrambling) return;
    if (isSolved(cubeState)) {
      toast.info('魔方已经是还原状态');
      return;
    }
    if (!workerRef.current) {
      toast.error('求解器未就绪，请刷新页面');
      return;
    }
    setIsSolverWorking(true);
    setSolverProgress('正在求解...');
    setSolveMoves([]);
    setCurrentSolveIndex(0);
    workerRef.current.postMessage({
      type: 'solve',
      cubeState,
      moveHistory,
      timeoutMs: 30000,
    });
  }, [cubeState, moveHistory, isSolving, isScrambling]);

  const executeNextSolveMove = useCallback(async () => {
    if (currentSolveIndex >= solveMoves.length || !isSolving) return;
    const move = solveMoves[currentSolveIndex];
    await applyMoveAsync(move, 100);
    setCurrentSolveIndex(prev => prev + 1);

    if (currentSolveIndex + 1 >= solveMoves.length) {
      setIsSolving(false);
      toast.success('魔方已还原！');
    }
  }, [currentSolveIndex, solveMoves, isSolving, applyMoveAsync]);

  const executeAllSolveMoves = useCallback(async () => {
    if (!isSolving || currentSolveIndex >= solveMoves.length) return;
    const remaining = solveMoves.slice(currentSolveIndex);
    for (const move of remaining) {
      await applyMoveAsync(move, 60);
      setCurrentSolveIndex(prev => prev + 1);
    }
    setIsSolving(false);
    toast.success('魔方已还原！');
  }, [isSolving, currentSolveIndex, solveMoves, applyMoveAsync]);

  const handleReset = useCallback(() => {
    // ★ 修复：terminate 旧 Worker，创建全新 Worker，彻底清除 Kociemba 残留状态
    // onmessage 在 useEffect 里绑定，这里 terminate 后 useEffect cleanup 会处理
    // 但 useEffect 不会重跑，所以手动重建并重新绑定 handler
    workerRef.current?.terminate();
    const w = new Worker(
      new URL('./solver-worker.ts', import.meta.url),
      { type: 'module' }
    );
    w.postMessage({ type: 'init' });
    w.onmessage = (e) => {
      const { type, solution, message, timeMs, algorithm } = e.data;
      if (type === 'progress') {
        setSolverProgress(message);
      } else if (type === 'solution') {
        setIsSolverWorking(false);
        setSolverProgress('');
        setSolveMoves(prev => {
          if (solution.length < prev.length || prev.length === 0) {
            setCurrentSolveIndex(0);
            setIsSolving(true);
            const label = algorithm ?? '求解器';
            const steps = solution.length === 0 ? '（已是还原状态）' : `${solution.length} 步（${timeMs}ms）`;
            toast.success(`${label}：${steps}`);
            return solution;
          }
          return prev;
        });
      } else if (type === 'error') {
        setIsSolverWorking(false);
        setSolverProgress('');
        toast.error(message);
      }
    };
    workerRef.current = w;
    setCubeState(createSolvedCube());
    setScrambleMoves([]);
    setSolveMoves([]);
    setCurrentSolveIndex(0);
    setMoveHistory([]);
    setIsSolving(false);
    setIsScrambling(false);
    setIsSolverWorking(false);
    setSolverProgress('');
    toast.info('魔方已重置');
  }, []);

  const handleManualMove = useCallback(async (notation: string) => {
    if (isAnimating || isScrambling || isSolving) return;
    await applyMoveAsync(notation, 100);
  }, [isAnimating, isScrambling, isSolving, applyMoveAsync]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              魔方求解器
            </span>
          </h1>
          <p className="text-slate-300 text-sm">
            Kociemba 两阶段算法 · Canvas 2D 渲染 · Web Worker 异步求解
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 魔方视图 */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">魔方展开图</CardTitle>
                  <div className="flex gap-2">
                    {isSolved(cubeState) && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">已还原</Badge>
                    )}
                    {isAnimating && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse">动画中...</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center bg-slate-900/50 rounded-lg p-4">
                  <canvas
                    ref={canvasRef}
                    width={340}
                    height={380}
                    className="max-w-full h-auto"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 控制按钮 */}
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              <Button
                onClick={handleScramble}
                disabled={isScrambling || isSolving || isAnimating}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <Dices className="w-4 h-4 mr-2" />
                打乱魔方
              </Button>
              <Button
                onClick={handleSolve}
                disabled={isSolving || isScrambling || isSolverWorking}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              >
                <Zap className="w-4 h-4 mr-2" />
                {isSolverWorking ? '求解中...' : '求解魔方'}
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                重置
              </Button>
            </div>

            {/* 求解进度提示 */}
            {isSolverWorking && solverProgress && (
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-300 bg-slate-800/60 rounded-lg px-4 py-2 border border-slate-600">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full" />
                {solverProgress}
              </div>
            )}
            <Card className="mt-4 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">手动旋转层</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {FACES.map(face => (
                    <div key={face} className="flex flex-col gap-1">
                      <span className="text-xs text-slate-400 text-center">
                        {FACE_NAMES_CN[face]} ({face})
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
                          onClick={() => handleManualMove(face)}
                          disabled={isAnimating || isScrambling || isSolving}
                        >
                          {face}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
                          onClick={() => handleManualMove(face + "'")}
                          disabled={isAnimating || isScrambling || isSolving}
                        >
                          {face}'
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 侧边面板 */}
          <div className="space-y-4">
            {/* 打乱序列 */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">打乱序列</CardTitle>
              </CardHeader>
              <CardContent>
                {scrambleMoves.length > 0 ? (
                  <div className="flex flex-wrap gap-1 text-xs">
                    {scrambleMoves.map((move, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-slate-700/50 text-slate-300">
                        {move}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">点击"打乱魔方"生成随机序列</p>
                )}
              </CardContent>
            </Card>

            {/* 求解步骤 */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm">求解步骤</CardTitle>
                  {solveMoves.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {currentSolveIndex}/{solveMoves.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {solveMoves.length > 0 ? (
                  <div className="space-y-3">
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {solveMoves.map((move, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                              i < currentSolveIndex
                                ? 'bg-green-500/20 text-green-400'
                                : i === currentSolveIndex
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-slate-700/30 text-slate-400'
                            }`}
                          >
                            <span className="w-6 text-xs text-slate-500">{i + 1}</span>
                            <span className="font-mono font-bold">{move}</span>
                            {i < currentSolveIndex && <span className="ml-auto text-xs">✓</span>}
                            {i === currentSolveIndex && isSolving && (
                              <span className="ml-auto text-xs animate-pulse">▶</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={executeNextSolveMove}
                        disabled={!isSolving || currentSolveIndex >= solveMoves.length || isAnimating}
                        className="flex-1 bg-blue-500 hover:bg-blue-600"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        下一步
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={executeAllSolveMoves}
                        disabled={!isSolving || currentSolveIndex >= solveMoves.length || isAnimating}
                        className="border-slate-600 text-slate-300"
                      >
                        <SkipForward className="w-3 h-3 mr-1" />
                        全部执行
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">先打乱魔方，然后点击"求解魔方"</p>
                )}
              </CardContent>
            </Card>

            {/* 操作历史 */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">操作历史</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[150px]">
                  <div className="flex flex-wrap gap-1">
                    {moveHistory.map((move, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 text-xs font-mono"
                      >
                        {move}
                      </span>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* 符号说明 */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">符号说明</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>R, L, U, D, F, B</span>
                    <span>顺时针旋转 90°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>R', L', ...</span>
                    <span>逆时针旋转 90°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>R2, L2, ...</span>
                    <span>旋转 180°</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}