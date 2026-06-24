import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import type { CubeState, FaceName, ColorName, Move } from '@/lib/cube-model';
import { COLOR_HEX_MAP, createSolvedCube } from '@/lib/cube-model';

const CUBE_SIZE = 60;
const GAP = 2;
const STEP = CUBE_SIZE + GAP;
const HALF = CUBE_SIZE / 2;

const CSS_FACE_NAMES: FaceName[] = ['F', 'B', 'U', 'D', 'R', 'L'];

const CSS_FACE_TRANSFORMS: Record<FaceName, string> = {
  F: `rotateY(0deg) translateZ(${HALF}px)`,
  B: `rotateY(180deg) translateZ(${HALF}px)`,
  U: `rotateX(90deg) translateZ(${HALF}px)`,
  D: `rotateX(-90deg) translateZ(${HALF}px)`,
  R: `rotateY(90deg) translateZ(${HALF}px)`,
  L: `rotateY(-90deg) translateZ(${HALF}px)`,
};

const FACE_NORMALS: Record<FaceName, [number, number, number]> = {
  F: [0, 0, 1],
  B: [0, 0, -1],
  U: [0, 1, 0],
  D: [0, -1, 0],
  R: [1, 0, 0],
  L: [-1, 0, 0],
};

const FACE_COLOR_MAP: Record<string, FaceName> = {
  '0,0,1': 'F',
  '0,0,-1': 'B',
  '0,1,0': 'U',
  '0,-1,0': 'D',
  '1,0,0': 'R',
  '-1,0,0': 'L',
};

function getCubieColor(
  state: CubeState,
  ori: number[][],
  gx: number,
  gy: number,
  gz: number,
  cssFace: FaceName,
): string {
  const [nx, ny, nz] = FACE_NORMALS[cssFace];
  const wx = ori[0][0] * nx + ori[0][1] * ny + ori[0][2] * nz;
  const wy = ori[1][0] * nx + ori[1][1] * ny + ori[1][2] * nz;
  const wz = ori[2][0] * nx + ori[2][1] * ny + ori[2][2] * nz;

  const key = `${Math.round(wx)},${Math.round(wy)},${Math.round(wz)}`;
  const worldFace = FACE_COLOR_MAP[key];
  if (!worldFace) return '#1a1a1a';

  let idx = -1;
  switch (worldFace) {
    case 'U': idx = (gz + 1) * 3 + (gx + 1); break;
    case 'D': idx = (1 - gz) * 3 + (gx + 1); break;
    case 'F': idx = (gy + 1) * 3 + (gx + 1); break;
    case 'B': idx = (gy + 1) * 3 + (1 - gx); break;
    case 'L': idx = (gy + 1) * 3 + (gz + 1); break;
    case 'R': idx = (gy + 1) * 3 + (1 - gz); break;
  }

  if (idx < 0 || idx > 8) return '#1a1a1a';
  const colorName = state.faces[worldFace][idx];
  return COLOR_HEX_MAP[colorName];
}

type Ori = number[][];
const IDENTITY: Ori = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

function matMul(a: Ori, b: Ori): Ori {
  return a.map(row => row.map((_, j) => row.reduce((sum, val, i) => sum + val * b[i][j], 0)));
}

const MOVE_ROTATIONS: Record<string, Ori> = {
  "R":  [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
  "R'": [[1, 0, 0], [0, 0, 1], [0, -1, 0]],
  "L":  [[1, 0, 0], [0, 0, 1], [0, -1, 0]],
  "L'": [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
  "U":  [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  "U'": [[0, 0, 1], [0, 1, 0], [-1, 0, 0]],
  "D":  [[0, 0, 1], [0, 1, 0], [-1, 0, 0]],
  "D'": [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  "F": [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  "F'": [[0, 1, 0], [-1, 0, 0], [0, 0, 1]],
  "B": [[0, 1, 0], [-1, 0, 0], [0, 0, 1]],
  "B'": [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
};

function getMoveNotation(move: Move): string {
  if (move.double) return move.face + '2';
  return move.clockwise ? move.face : move.face + "'";
}

function getRotationAxis(face: FaceName): 'x' | 'y' | 'z' {
  switch (face) {
    case 'U': case 'D': return 'y';
    case 'F': case 'B': return 'z';
    case 'L': case 'R': return 'x';
  }
}

function getLayerValue(face: FaceName): number {
  switch (face) {
    case 'U': case 'F': case 'R': return 1;
    case 'D': case 'B': case 'L': return -1;
  }
}

function getMoveAngle(move: Move): number {
  let base = 90;
  // 严格依据 CSS Y-down 坐标系的右手法则分配真实顺时针角度
  switch (move.face) {
    case 'R': case 'D': case 'F':
      base = move.clockwise ? 90 : -90;
      break;
    case 'L': case 'U': case 'B':
      base = move.clockwise ? -90 : 90;
      break;
  }
  return move.double ? base * 2 : base;
}

export interface RubiksCubeCSSRef {
  animateMove: (move: Move) => Promise<void>;
  resetCube: () => void;
}

interface RubiksCubeCSSProps {
  cubeState: CubeState;
  onMoveComplete?: () => void;
  isAnimating: boolean;
  setIsAnimating: (v: boolean) => void;
  ref?: React.Ref<RubiksCubeCSSRef>;
}

interface QueuedMove {
  move: Move;
  resolve: () => void;
}

const RubiksCubeCSS = forwardRef<RubiksCubeCSSRef, RubiksCubeCSSProps>(function RubiksCubeCSS(
  { cubeState, onMoveComplete, isAnimating: parentIsAnimating, setIsAnimating: setParentIsAnimating },
  externalRef,
) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const cubeWrapperRef = useRef<HTMLDivElement>(null);
  const cubieElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const cubiePositionsRef = useRef<Map<string, [number, number, number]>>(new Map());
  const cubieOrientationsRef = useRef<Map<string, Ori>>(new Map());
  const moveQueueRef = useRef<QueuedMove[]>([]);
  const isProcessingRef = useRef(false);
  const onMoveCompleteRef = useRef(onMoveComplete);
  const setIsAnimatingRef = useRef(setParentIsAnimating);

  const [viewRot, setViewRot] = useState({ x: -25, y: -35 });
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const viewRotRef = useRef(viewRot);
  viewRotRef.current = viewRot;

  useEffect(() => {
    onMoveCompleteRef.current = onMoveComplete;
  }, [onMoveComplete]);

  useEffect(() => {
    setIsAnimatingRef.current = setParentIsAnimating;
  }, [setParentIsAnimating]);

  const updateCubieTransform = useCallback((key: string) => {
    const el = cubieElsRef.current.get(key);
    const pos = cubiePositionsRef.current.get(key);
    const ori = cubieOrientationsRef.current.get(key);
    if (!el || !pos || !ori) return;

    const [r00, r01, r02] = ori[0];
    const [r10, r11, r12] = ori[1];
    const [r20, r21, r22] = ori[2];

    const tx = pos[0] * STEP;
    const ty = pos[1] * STEP;
    const tz = pos[2] * STEP;

    el.style.transform = `matrix3d(${r00},${r10},${r20},0,${r01},${r11},${r21},0,${r02},${r12},${r22},0,${tx},${ty},${tz},1)`;
  }, []);

  const updateCubieColor = useCallback((key: string) => {
    const el = cubieElsRef.current.get(key);
    const pos = cubiePositionsRef.current.get(key);
    const ori = cubieOrientationsRef.current.get(key);
    if (!el || !pos || !ori) return;
    const [gx, gy, gz] = pos;

    const faces = el.querySelectorAll<HTMLDivElement>('.cube-face');
    faces.forEach((faceEl, i) => {
      const cssFace = CSS_FACE_NAMES[i];
      const color = getCubieColor(cubeState, ori, gx, gy, gz, cssFace);
      faceEl.style.backgroundColor = color;
    });
  }, [cubeState]);

  const updateAllColors = useCallback(() => {
    cubieElsRef.current.forEach((_, key) => updateCubieColor(key));
  }, [updateCubieColor]);

  useEffect(() => {
    if (!parentIsAnimating) {
      updateAllColors();
    }
  }, [cubeState, parentIsAnimating, updateAllColors]);

  const processQueue = useRef<(() => void) | null>(null);

  const animateMove = useCallback((move: Move): Promise<void> => {
    return new Promise<void>(resolve => {
      moveQueueRef.current.push({ move, resolve });
      if (!isProcessingRef.current) {
        processQueue.current?.();
      }
    });
  }, []);

  useEffect(() => {
    processQueue.current = () => {
      if (moveQueueRef.current.length === 0) {
        isProcessingRef.current = false;
        return;
      }

      isProcessingRef.current = true;
      const { move, resolve } = moveQueueRef.current.shift()!;
      const notation = getMoveNotation(move);
      const moveRot = MOVE_ROTATIONS[notation];
      if (!moveRot) {
        resolve();
        processQueue.current?.();
        return;
      }

      const axis = getRotationAxis(move.face);
      const layerVal = getLayerValue(move.face);
      const angle = getMoveAngle(move);

      const layerCubies: string[] = [];
      cubiePositionsRef.current.forEach((pos, key) => {
        const coord = pos[axis === 'x' ? 0 : axis === 'y' ? 1 : 2];
        if (coord === layerVal) {
          layerCubies.push(key);
        }
      });

      const scene = sceneRef.current;
      if (!scene) {
        resolve();
        processQueue.current?.();
        return;
      }

      setIsAnimatingRef.current(true);

      const pivot = document.createElement('div');
      pivot.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        transform-style: preserve-3d;
        transition: transform 0.2s ease-in-out;
      `;
      scene.appendChild(pivot);

      layerCubies.forEach(key => {
        const el = cubieElsRef.current.get(key);
        if (el) {
          el.style.transition = 'none';
          el.style.transform = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)';
          pivot.appendChild(el);
        }
      });

      void pivot.offsetHeight;

      const axisCSS = axis === 'x' ? 'X' : axis === 'y' ? 'Y' : 'Z';
      pivot.style.transition = 'transform 0.2s ease-in-out';
      pivot.style.transform = `rotate${axisCSS}(${angle}deg)`;

      const onTransitionEnd = () => {
        pivot.removeEventListener('transitionend', onTransitionEnd);

        layerCubies.forEach(key => {
          const el = cubieElsRef.current.get(key);
          if (el) {
            pivot.removeChild(el);
            scene.appendChild(el);
          }

          const currentOri = cubieOrientationsRef.current.get(key)!;
          cubieOrientationsRef.current.set(key, matMul(moveRot, currentOri));

          const [px, py, pz] = cubiePositionsRef.current.get(key)!;
          const nx = moveRot[0][0] * px + moveRot[0][1] * py + moveRot[0][2] * pz;
          const ny = moveRot[1][0] * px + moveRot[1][1] * py + moveRot[1][2] * pz;
          const nz = moveRot[2][0] * px + moveRot[2][1] * py + moveRot[2][2] * pz;
          cubiePositionsRef.current.set(key, [Math.round(nx), Math.round(ny), Math.round(nz)]);

          if (el) {
            el.style.transition = 'none';
          }
          updateCubieTransform(key);
          updateCubieColor(key);
        });

        scene.removeChild(pivot);
        setIsAnimatingRef.current(false);
        onMoveCompleteRef.current?.();
        resolve();
        processQueue.current?.();
      };

      pivot.addEventListener('transitionend', onTransitionEnd);

      setTimeout(() => {
        if (pivot.parentNode) {
          onTransitionEnd();
        }
      }, 300);
    };
  }, [updateCubieTransform, updateCubieColor]);

  const resetCube = useCallback(() => {
    moveQueueRef.current.forEach(({ resolve }) => resolve());
    moveQueueRef.current = [];
    isProcessingRef.current = false;
    setIsAnimatingRef.current(false);

    const scene = sceneRef.current;
    if (!scene) return;

    const children = Array.from(scene.children);
    children.forEach(child => {
      if (child !== cubeWrapperRef.current) {
        scene.removeChild(child);
      }
    });

    cubieElsRef.current.clear();
    cubiePositionsRef.current.clear();
    cubieOrientationsRef.current.clear();

    const solvedState = createSolvedCube();
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const key = `${x},${y},${z}`;
          cubiePositionsRef.current.set(key, [x, y, z]);
          cubieOrientationsRef.current.set(key, IDENTITY);

          const el = document.createElement('div');
          el.className = 'cubie';
          el.style.cssText = `
            position: absolute;
            width: ${CUBE_SIZE}px;
            height: ${CUBE_SIZE}px;
            left: ${-HALF}px;
            top: ${-HALF}px;
            transform-style: preserve-3d;
          `;

          CSS_FACE_NAMES.forEach(cssFace => {
            const faceEl = document.createElement('div');
            faceEl.className = 'cube-face';
            faceEl.style.cssText = `
              position: absolute;
              width: ${CUBE_SIZE - 4}px;
              height: ${CUBE_SIZE - 4}px;
              left: 2px;
              top: 2px;
              transform: ${CSS_FACE_TRANSFORMS[cssFace]};
              backface-visibility: hidden;
              border-radius: 4px;
              border: 1px solid rgba(0,0,0,0.3);
            `;
            const color = getCubieColor(solvedState, IDENTITY, x, y, z, cssFace);
            faceEl.style.backgroundColor = color;
            el.appendChild(faceEl);
          });

          cubieElsRef.current.set(key, el);
          cubeWrapperRef.current?.appendChild(el);
        }
      }
    }

    setViewRot({ x: -25, y: -35 });
  }, []);

  useImperativeHandle(externalRef, () => ({
    animateMove,
    resetCube,
  }), [animateMove, resetCube]);

  // Initialize cube
  useEffect(() => {
    if (!cubeWrapperRef.current) return;
    resetCube();
  }, []);

  // View rotation via mouse/touch drag
  useEffect(() => {
    const container = sceneRef.current;
    if (!container) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if ((e as MouseEvent).button !== 0 && e.type === 'mousedown') return;
      isDraggingRef.current = true;
      const pos = 'touches' in e ? e.touches[0] : e;
      lastPosRef.current = { x: pos.clientX, y: pos.clientY };
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const pos = 'touches' in e ? e.touches[0] : e;
      const dx = pos.clientX - lastPosRef.current.x;
      const dy = pos.clientY - lastPosRef.current.y;
      lastPosRef.current = { x: pos.clientX, y: pos.clientY };

      const current = viewRotRef.current;
      setViewRot({
        x: Math.max(-89, Math.min(89, current.x - dy * 0.5)),
        y: current.y + dx * 0.5,
      });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    container.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      container.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      container.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, []);

  return (
    <div
      ref={sceneRef}
      className="w-full h-full overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing"
      style={{ perspective: '800px', perspectiveOrigin: '50% 50%' }}
    >
      <div
        ref={cubeWrapperRef}
        className="absolute left-1/2 top-1/2"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${viewRot.x}deg) rotateY(${viewRot.y}deg)`,
        }}
      />
    </div>
  );
});

export default RubiksCubeCSS;
