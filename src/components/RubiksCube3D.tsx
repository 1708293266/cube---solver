import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CubeState, FaceName, ColorName, Move } from '@/lib/cube-model';
import { COLOR_HEX_MAP, FACE_COLORS_HEX, createSolvedCube, getFaceColorAt } from '@/lib/cube-model';

const CUBE_SIZE = 1;
const GAP = 0.02;
const STEP = CUBE_SIZE + GAP;
const HALF = CUBE_SIZE / 2;

// =============================================================================
// Static mapping table: 2D net face index → 3D cubie (x, y, z) face
// =============================================================================
// Grid layout per face (3x3), indices 0-8:
//   0 1 2
//   3 4 5
//   6 7 8
//
// 3D coordinate system: x∈{-1,0,1}, y∈{-1,0,1}, z∈{-1,0,1}
//   +X = Right,  -X = Left
//   +Y = Up,     -Y = Down  【已修正：回归标准标准右手坐标系】
//   +Z = Front,  -Z = Back
// =============================================================================
function getFaceIndex(face: FaceName, x: number, y: number, z: number): number {
  switch (face) {
   // U face (y=1): 看着 +Y 面，z=-1 是顶层(行0), z=1 是底层(行2)
    case 'U': return (z + 1) * 3 + (x + 1);
    
    // D face (y=-1): 看着 -Y 面，z=1 是顶层(行0), z=-1 是底层(行2)
    case 'D': return (1 - z) * 3 + (x + 1);
    
    // F face (z=1): 看着 +Z 面，y=1 是物理顶层(对应状态行0)，y=-1 是物理底层(对应状态行2)
    case 'F': return (1 - y) * 3 + (x + 1);
    
    // B face (z=-1): 看着 -Z 面，y=1 是物理顶层(对应状态行0)，x=1 是左
    case 'B': return (1 - y) * 3 + (1 - x);
    
    // L face (x=-1): 看着 -X 面，y=1 是物理顶层(对应状态行0)，z=-1 是左
    case 'L': return (1 - y) * 3 + (z + 1);
    
    // R face (x=1): 看着 +X 面，y=1 是物理顶层(对应状态行0)，z=1 是左
    case 'R': return (1 - y) * 3 + (1 - z);
  }
}

// 哪些块的面暴露在外面？返回每个可见面的 [面名称, 外部法向量]
function getVisibleFaces(x: number, y: number, z: number): Array<{ face: FaceName; normal: THREE.Vector3 }> {
  const faces: Array<{ face: FaceName; normal: THREE.Vector3 }> = [];
  if (z === 1) faces.push({ face: 'F', normal: new THREE.Vector3(0, 0, 1) });
  if (z === -1) faces.push({ face: 'B', normal: new THREE.Vector3(0, 0, -1) });
  if (y === 1) faces.push({ face: 'U', normal: new THREE.Vector3(0, 1, 0) });   // 修正：+Y 为顶面 U
  if (y === -1) faces.push({ face: 'D', normal: new THREE.Vector3(0, -1, 0) }); // 修正：-Y 为底面 D
  if (x === 1) faces.push({ face: 'R', normal: new THREE.Vector3(1, 0, 0) });
  if (x === -1) faces.push({ face: 'L', normal: new THREE.Vector3(-1, 0, 0) });
  return faces;
}

// 内部小块状态
interface CubieData {
  x: number;
  y: number;
  z: number;
  colors: Record<string, ColorName>;
}

function createCubieData(x: number, y: number, z: number): CubieData {
  const colors: Record<string, ColorName> = {};
  if (x === 1) colors['1,0,0'] = 'orange';
  if (x === -1) colors['-1,0,0'] = 'red';
  if (y === 1) colors['0,1,0'] = 'yellow';   // 修正：+Y 轴对应 U 面黄色
  if (y === -1) colors['0,-1,0'] = 'white';  // 修正：-Y 轴对应 D 面白色
  if (z === 1) colors['0,0,1'] = 'green';
  if (z === -1) colors['0,0,-1'] = 'blue';
  return { x, y, z, colors };
}

// 基础旋转矩阵（标准右手系：从动轴正方向看去，顺时针旋转 90 度）
const ROTATIONS: Record<string, THREE.Matrix3> = {};

function createRotationMatrix(axis: 'x' | 'y' | 'z', angle: number): THREE.Matrix3 {
  const m = new THREE.Matrix3();
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  if (axis === 'x') {
    m.set(1, 0, 0, 0, c, -s, 0, s, c);
  } else if (axis === 'y') {
    m.set(c, 0, s, 0, 1, 0, -s, 0, c);
  } else {
    m.set(c, -s, 0, s, c, 0, 0, 0, 1);
  }
  return m;
}

ROTATIONS['R'] = createRotationMatrix('x', -Math.PI / 2);
ROTATIONS["R'"] = createRotationMatrix('x', Math.PI / 2);
ROTATIONS['L'] = createRotationMatrix('x', Math.PI / 2);
ROTATIONS["L'"] = createRotationMatrix('x',- Math.PI / 2);
ROTATIONS['U'] = createRotationMatrix('y', -Math.PI / 2);
ROTATIONS["U'"] = createRotationMatrix('y', Math.PI / 2);
ROTATIONS['D'] = createRotationMatrix('y', Math.PI / 2);
ROTATIONS["D'"] = createRotationMatrix('y',- Math.PI / 2);
ROTATIONS['F'] = createRotationMatrix('z', -Math.PI / 2);
ROTATIONS["F'"] = createRotationMatrix('z', Math.PI / 2);
ROTATIONS['B'] = createRotationMatrix('z', Math.PI / 2);
ROTATIONS["B'"] = createRotationMatrix('z', -Math.PI / 2);

function getLayerFilter(notation: string): (c: CubieData) => boolean {
  const face = notation[0];
  switch (face) {
    case 'R': return c => c.x === 1;
    case 'L': return c => c.x === -1;
    case 'U': return c => c.y === 1;  // 修正：直接对应顶层 y === 1
    case 'D': return c => c.y === -1; // 修正：直接对应底层 y === -1
    case 'F': return c => c.z === 1;
    case 'B': return c => c.z === -1;
    default: return () => false;
  }
}

/**
 * 废弃此处的对抗性乱置函数，直接返回原表示法。
 * 不再在底层偷偷用 U 调换 D
 */
function transformUDNotation(notation: string): string {
  return notation;
}

function rotateCubiePosition(c: CubieData, notation: string): void {
  const isDouble = notation.includes('2');
  const times = isDouble ? 2 : 1;
  const baseNotation = isDouble ? notation.replace('2', '') : notation;
  const rot = ROTATIONS[baseNotation];
  if (!rot) return;

  for (let t = 0; t < times; t++) {
    const pos = new THREE.Vector3(c.x, c.y, c.z);
    pos.applyMatrix3(rot);
    c.x = Math.round(pos.x);
    c.y = Math.round(pos.y);
    c.z = Math.round(pos.z);

    const oldColors = { ...c.colors };
    c.colors = {};
    for (const [key, color] of Object.entries(oldColors)) {
      const [nx, ny, nz] = key.split(',').map(Number);
      const v = new THREE.Vector3(nx, ny, nz);
      v.applyMatrix3(rot);
      const newKey = `${Math.round(v.x)},${Math.round(v.y)},${Math.round(v.z)}`;
      c.colors[newKey] = color;
    }
  }
}

export interface RubiksCube3DRef {
  animateMove: (move: Move) => Promise<void>;
  resetCube: () => void;
  applyCubeState: (state: CubeState) => void;
  // 新增：把 3D 当前可见状态导出为 CubeState（applyCubeState 的精确逆运算）
  getCubeState: () => CubeState;
}

interface RubiksCube3DProps {
  cubeState: CubeState;
  onMoveComplete?: () => void;
  isAnimating: boolean;
  setIsAnimating: (v: boolean) => void;
  ref?: React.Ref<RubiksCube3DRef>;
}

const RubiksCube3D = forwardRef<RubiksCube3DRef, RubiksCube3DProps>(function RubiksCube3D(
  { cubeState, onMoveComplete, isAnimating: parentIsAnimating, setIsAnimating: setParentIsAnimating },
  externalRef,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cubiesRef = useRef<CubieData[]>([]);
  const animFrameRef = useRef<number>(0);
  const moveQueueRef = useRef<Array<{ move: Move; resolve: () => void }>>([]);
  const isProcessingRef = useRef(false);
  const isMountedRef = useRef(false);

  const [shake, setShake] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(5, 4, 6);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.pointerEvents = 'auto';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-5, -3, -5);
    scene.add(dirLight2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.enablePan = false;
    controls.screenSpacePanning = false;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controlsRef.current = controls;

    const animate = () => {
      if (!isMountedRef.current) return;
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    initCubies();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
      controls.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  function initCubies() {
    const scene = sceneRef.current;
    if (!scene) return;

    const toRemove: THREE.Object3D[] = [];
    scene.traverse(obj => {
      if (obj.userData.isCubie) toRemove.push(obj);
    });
    toRemove.forEach(obj => scene.remove(obj));

    cubiesRef.current = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          cubiesRef.current.push(createCubieData(x, y, z));
        }
      }
    }

    rebuildMeshes();
  }

  function rebuildMeshes() {
    const scene = sceneRef.current;
    if (!scene) return;

    const toRemove: THREE.Object3D[] = [];
    scene.traverse(obj => {
      if (obj.userData.isCubie) toRemove.push(obj);
    });
    toRemove.forEach(obj => scene.remove(obj));

    const blackMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.5,
      metalness: 0.1,
    });

    cubiesRef.current.forEach(cubie => {
      const group = new THREE.Group();
      group.userData.isCubie = true;

      const baseGeo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
      const baseMesh = new THREE.Mesh(baseGeo, blackMaterial);
      group.add(baseMesh);

      const visibleFaces = getVisibleFaces(cubie.x, cubie.y, cubie.z);
      const stickerSize = CUBE_SIZE - 0.08;
      const stickerOffset = HALF + 0.001;

      visibleFaces.forEach(({ face, normal }) => {
        const colorName = cubie.colors[`${normal.x},${normal.y},${normal.z}`];
        const hexColor = colorName ? COLOR_HEX_MAP[colorName] : FACE_COLORS_HEX[face];

        const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
        const stickerMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(hexColor),
          roughness: 0.3,
          metalness: 0.05,
        });
        const sticker = new THREE.Mesh(stickerGeo, stickerMat);

        sticker.position.copy(normal.clone().multiplyScalar(stickerOffset));

        const up = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        sticker.lookAt(normal.clone().multiplyScalar(2));

        group.add(sticker);
      });

      group.position.set(cubie.x * STEP, cubie.y * STEP, cubie.z * STEP);
      scene.add(group);
    });
  }

  function applyMoveToCubies(notation: string) {
    const transformedNotation = transformUDNotation(notation);
    const isDouble = transformedNotation.includes('2');
    const times = isDouble ? 2 : 1;
    const baseNotation = isDouble ? transformedNotation.replace('2', '') : transformedNotation;
    const filter = getLayerFilter(baseNotation);

    for (let t = 0; t < times; t++) {
      cubiesRef.current.filter(filter).forEach(cubie => {
        rotateCubiePosition(cubie, baseNotation);
      });
    }
  }

  const animateMove = useCallback((move: Move): Promise<void> => {
    return new Promise<void>(resolve => {
      const notation = move.double ? move.face + '2' : (move.clockwise ? move.face : move.face + "'");
      moveQueueRef.current.push({ move: { ...move, notation }, resolve });
      if (!isProcessingRef.current) {
        processNextMove();
      }
    });
  }, []);

  const processNextMove = useCallback(() => {
    if (moveQueueRef.current.length === 0) {
      isProcessingRef.current = false;
      return;
    }

    isProcessingRef.current = true;
    const { move, resolve } = moveQueueRef.current.shift()!;
    const notation = move.notation;

    applyMoveToCubies(notation);
    rebuildMeshes();

    setShake(true);
    setTimeout(() => setShake(false), 150);

    setTimeout(() => {
      resolve();
      onMoveComplete?.();
      processNextMove();
    }, 80);
  }, [onMoveComplete]);

  const resetCube = useCallback(() => {
    moveQueueRef.current.forEach(({ resolve }) => resolve());
    moveQueueRef.current = [];
    isProcessingRef.current = false;
    setParentIsAnimating(false);

    initCubies();
  }, [setParentIsAnimating]);

  const applyCubeState = useCallback((state: CubeState) => {
    moveQueueRef.current.forEach(({ resolve }) => resolve());
    moveQueueRef.current = [];
    isProcessingRef.current = false;
    setParentIsAnimating(false);

    cubiesRef.current = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const cubie = createCubieData(x, y, z);
          const visibleFaces = getVisibleFaces(x, y, z);
          
          for (const { face, normal } of visibleFaces) {
            // 修正：彻底干掉顶底面掉包（virtualFace）的逻辑
            const faceIndex = getFaceIndex(face, x, y, z);
            const colorName = state.faces[face][faceIndex];
            cubie.colors[`${normal.x},${normal.y},${normal.z}`] = colorName;
          }
          cubiesRef.current.push(cubie);
        }
      }
    }
    rebuildMeshes();
  }, [setParentIsAnimating]);

  // ============================================================================
  // 新增：读取 3D 魔方当前真实可见状态，导出为 CubeState
  // 它是 applyCubeState 的精确逆运算：用同一套 getVisibleFaces + getFaceIndex 映射，
  // 直接从每个小块当前朝外的贴纸颜色反推回 2D 网格索引。
  // 因此只要 2D→3D（applyCubeState）是对的，3D→2D（getCubeState）就一定一致，
  // 而且读到的就是动画转动后真正显示出来的颜色，不依赖任何外部逻辑状态。
  // ============================================================================
  const getCubeState = useCallback((): CubeState => {
    const faces = {
      U: new Array<ColorName>(9),
      D: new Array<ColorName>(9),
      F: new Array<ColorName>(9),
      B: new Array<ColorName>(9),
      L: new Array<ColorName>(9),
      R: new Array<ColorName>(9),
    } as Record<FaceName, ColorName[]>;

    cubiesRef.current.forEach(cubie => {
      const visibleFaces = getVisibleFaces(cubie.x, cubie.y, cubie.z);
      for (const { face, normal } of visibleFaces) {
        const faceIndex = getFaceIndex(face, cubie.x, cubie.y, cubie.z);
        const colorName = cubie.colors[`${normal.x},${normal.y},${normal.z}`];
        if (colorName) {
          faces[face][faceIndex] = colorName;
        }
      }
    });

    return { faces };
  }, []);

  useImperativeHandle(externalRef, () => ({
    animateMove,
    resetCube,
    applyCubeState,
    getCubeState,
  }), [animateMove, resetCube, applyCubeState, getCubeState]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{
        transform: shake ? 'translateX(2px)' : 'none',
        transition: 'transform 0.05s ease-out',
      }}
    />
  );
});

export default RubiksCube3D;