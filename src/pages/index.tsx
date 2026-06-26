import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Dices, Zap, RotateCcw, Play, SkipForward, Pencil } from 'lucide-react';
import RubiksCube3D, { type RubiksCube3DRef } from '@/components/RubiksCube3D';
import CubeNetInput from '@/components/CubeNetInput';
import type { CubeState, Move } from '@/lib/cube-model';
import { createSolvedCube, parseMove, generateScramble, invertMove, isSolved, applyMove } from '@/lib/cube-model';

// Web Worker for solving (prevents UI blocking)
let solverWorker: Worker | null = null;

function getSolverWorker() {
  if (!solverWorker) {
    solverWorker = new Worker(new URL('@/lib/solver-worker.ts', import.meta.url), { type: 'module' });
  }
  return solverWorker;
}

export default function RubiksCubePage() {
  const cubeRef = useRef<RubiksCube3DRef>(null);
  const [cubeState, setCubeState] = useState<CubeState>(createSolvedCube());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [scrambleMoves, setScrambleMoves] = useState<string[]>([]);
  const [solveMoves, setSolveMoves] = useState<string[]>([]);
  const [currentSolveIndex, setCurrentSolveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isScrambling, setIsScrambling] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [isNetInputOpen, setIsNetInputOpen] = useState(false);

  const handleMoveComplete = useCallback(() => {
    // Move completed in 3D, state is already updated
  }, []);

  const handleScramble = useCallback(async () => {
    if (isScrambling || isSolving || isAnimating) return;

    const moves = generateScramble(20);
    setScrambleMoves(moves);
    setSolveMoves([]);
    setCurrentSolveIndex(0);
    setMoveHistory([]);
    setCubeState(createSolvedCube());
    setIsScrambling(true);

    cubeRef.current?.resetCube();
    await new Promise(resolve => setTimeout(resolve, 100));

    let currentState = createSolvedCube();
    for (const moveNotation of moves) {
      const move = parseMove(moveNotation);
      await cubeRef.current?.animateMove(move);
      currentState = applyMove(currentState, move);
      setCubeState({ ...currentState });
      setMoveHistory(prev => [...prev, moveNotation]);
    }

    setIsScrambling(false);
    toast.success('魔方已打乱！');
  }, [isScrambling, isSolving, isAnimating]);

  const handleSolve = useCallback(async () => {
    if (isSolving || isScrambling) return;
    if (isSolved(cubeState)) {
      toast.info('魔方已经是还原状态');
      return;
    }

    setIsSolving(true);
    toast.info('正在求解...');

    // Use Web Worker for solving to prevent UI blocking
    const worker = getSolverWorker();
    
    worker.onmessage = (e) => {
      const { type, solution, message, error, timeMs, algorithm } = e.data;

      if (type === 'progress') {
        toast.info(message);
      } else if (type === 'solution') {
        const moves = Array.isArray(solution) ? solution : [];
        setSolveMoves(moves);
        setCurrentSolveIndex(0);
        setIsSolving(false);

        if (moves.length > 0) {
          const label = algorithm ?? 'Kociemba';
          const elapsed = typeof timeMs === 'number' ? `，用时 ${timeMs}ms` : '';
          toast.success(`${label} 已生成 ${moves.length} 步${elapsed}`);
        } else {
          toast.success('魔方已经是还原状态');
        }
      } else if (type === 'error') {
        toast.error(error || message || '求解失败');
        setIsSolving(false);
      }
    };

    worker.onerror = (err) => {
      console.error('Worker error:', err);
      toast.error('求解器出错');
      setIsSolving(false);
    };

    // Send solve request to worker
    worker.postMessage({
      type: 'solve',
      cubeState,
      moveHistory,
      timeoutMs: 30000,
    });
  }, [cubeState, isSolving, isScrambling, moveHistory]);

  const executeNextSolveMove = useCallback(async () => {
    if (solveMoves.length === 0 || currentSolveIndex >= solveMoves.length || isAnimating) return;

    const moveNotation = solveMoves[currentSolveIndex];
    const move = parseMove(moveNotation);
    let nextStateAfterMove: CubeState | null = null;

    await cubeRef.current?.animateMove(move);

    setCubeState(prev => {
      const next = applyMove(prev, move);
      nextStateAfterMove = next;
      return { ...next };
    });

    setCurrentSolveIndex(prev => prev + 1);
    setMoveHistory(prev => [...prev, moveNotation]);

    if (currentSolveIndex + 1 >= solveMoves.length) {
      setIsSolving(false);
      setSolveMoves([]);
      setCurrentSolveIndex(0);
      if (nextStateAfterMove && isSolved(nextStateAfterMove)) {
        toast.success('魔方已还原！');
      } else {
        toast.error('步骤执行完毕，但魔方还不是还原状态，请再次点击求解。');
      }
    }
  }, [currentSolveIndex, solveMoves, isAnimating]);

  const executeAllSolveMoves = useCallback(async () => {
    if (solveMoves.length === 0 || currentSolveIndex >= solveMoves.length || isAnimating) return;

    const remaining = solveMoves.slice(currentSolveIndex);
    let currentState = cubeState;

    for (const moveNotation of remaining) {
      const move = parseMove(moveNotation);
      await cubeRef.current?.animateMove(move);
      currentState = applyMove(currentState, move);
      setCubeState({ ...currentState });
      setMoveHistory(prev => [...prev, moveNotation]);
      setCurrentSolveIndex(prev => prev + 1);
    }

    setIsSolving(false);
    setSolveMoves([]);
    setCurrentSolveIndex(0);
    if (isSolved(currentState)) {
      toast.success('魔方已还原！');
    } else {
      toast.error('步骤执行完毕，但魔方还不是还原状态，请再次点击求解。');
    }
  }, [currentSolveIndex, solveMoves, cubeState, isAnimating]);

  const handleReset = useCallback(() => {
    cubeRef.current?.resetCube();
    setCubeState(createSolvedCube());
    setScrambleMoves([]);
    setSolveMoves([]);
    setCurrentSolveIndex(0);
    setMoveHistory([]);
    setIsSolving(false);
    setIsScrambling(false);
    toast.info('魔方已重置');
  }, []);

  const handleManualMove = useCallback(async (notation: string) => {
    if (isAnimating || isScrambling || isSolving) return;

    const move = parseMove(notation);
    await cubeRef.current?.animateMove(move);

    setCubeState(prev => {
      const next = applyMove(prev, move);
      return { ...next };
    });
    setMoveHistory(prev => [...prev, notation]);
  }, [isAnimating, isScrambling, isSolving]);

  const handleNetComplete = useCallback((state: CubeState) => {
    cubeRef.current?.applyCubeState(state);
    setCubeState({ ...state });
    setScrambleMoves([]);
    setSolveMoves([]);
    setCurrentSolveIndex(0);
    setMoveHistory([]);
    setIsSolving(false);
    setIsScrambling(false);
    toast.success('颜色已同步到 3D 魔方！');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 max-w-7xl">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              魔方求解器
            </span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 魔方视图 */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">
                    3D 魔方
                    <span className="ml-2 text-sm font-normal text-slate-400">（绿色为正面，黄色为上面）</span>
                  </CardTitle>
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
                <div className="bg-slate-900/50 rounded-lg p-2 sm:p-4 h-[360px] sm:h-[440px] lg:h-[500px]">
                  <RubiksCube3D
                    ref={cubeRef}
                    cubeState={cubeState}
                    onMoveComplete={handleMoveComplete}
                    isAnimating={isAnimating}
                    setIsAnimating={setIsAnimating}
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
                disabled={isSolving || isScrambling || isSolved(cubeState)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              >
                <Zap className="w-4 h-4 mr-2" />
                求解魔方
              </Button>
              <Button
                onClick={() => setIsNetInputOpen(true)}
                disabled={isAnimating || isScrambling || isSolving}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Pencil className="w-4 h-4 mr-2" />
                输入
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

            {/* 手动旋转 */}
            <Card className="mt-4 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">手动旋转层</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {['U', 'D', 'F', 'B', 'L', 'R'].map(face => (
                    <div key={face} className="flex flex-col gap-1">
                      <span className="text-xs text-slate-400 text-center">
                        {face}
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
                        disabled={solveMoves.length === 0 || currentSolveIndex >= solveMoves.length || isAnimating}
                        className="flex-1 bg-blue-500 hover:bg-blue-600"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        下一步
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={executeAllSolveMoves}
                        disabled={solveMoves.length === 0 || currentSolveIndex >= solveMoves.length || isAnimating}
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
                  <div className="mt-4 text-slate-500">
                    💡 提示：拖动鼠标/触摸可旋转视角
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CubeNetInput
        open={isNetInputOpen}
        onOpenChange={setIsNetInputOpen}
        onComplete={handleNetComplete}
        initialCubeState={cubeState}
      />
    </div>
  );
}
