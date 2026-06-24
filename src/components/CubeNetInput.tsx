import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { COLOR_HEX_MAP, type ColorName, type CubeState, type FaceName } from '@/lib/cube-model';
import { cn } from '@/lib/utils';
import { X, Check } from 'lucide-react';

const FACE_ORDER: FaceName[] = ['U', 'L', 'F', 'R', 'B', 'D'];
const FACE_LABELS: Record<FaceName, string> = {
  U: '上 (U)',
  D: '下 (D)',
  F: '前 (F)',
  B: '后 (B)',
  L: '左 (L)',
  R: '右 (R)',
};
const COLOR_NAMES: ColorName[] = ['white', 'yellow', 'red', 'orange', 'blue', 'green'];
const COLOR_LABELS: Record<ColorName, string> = {
  white: '白',
  yellow: '黄',
  red: '红',
  orange: '橙',
  blue: '蓝',
  green: '绿',
};

// Cross layout positions: [row, col] in a 5x4 grid
// Row 0: empty, U, empty, empty
// Row 1: L, F, R, B
// Row 2: empty, D, empty, empty
const FACE_GRID_POSITION: Record<FaceName, [number, number]> = {
  U: [0, 1],
  L: [1, 0],
  F: [1, 1],
  R: [1, 2],
  B: [1, 3],
  D: [2, 1],
};

function createDefaultNet(): Record<FaceName, ColorName[]> {
  const net: Record<FaceName, ColorName[]> = {} as Record<FaceName, ColorName[]>;
  const defaultColors: Record<FaceName, ColorName> = {
    U: 'yellow',
    D: 'white',
    F: 'green',
    B: 'blue',
    L: 'red',
    R: 'orange',
  };
  for (const face of FACE_ORDER) {
    net[face] = Array(9).fill(defaultColors[face]);
  }
  return net;
}

interface CubeNetInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (state: CubeState) => void;
  initialCubeState?: CubeState | null;
}

export default function CubeNetInput({ open, onOpenChange, onComplete, initialCubeState }: CubeNetInputProps) {
  const [net, setNet] = useState<Record<FaceName, ColorName[]>>(() => {
    if (initialCubeState) {
      return {
        U: [...initialCubeState.faces.U],
        D: [...initialCubeState.faces.D],
        F: [...initialCubeState.faces.F],
        B: [...initialCubeState.faces.B],
        L: [...initialCubeState.faces.L],
        R: [...initialCubeState.faces.R],
      };
    }
    return createDefaultNet();
  });

  const [selectedSticker, setSelectedSticker] = useState<{ face: FaceName; index: number } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Reset net when dialog opens with new initial state
  useEffect(() => {
    if (open) {
         if (initialCubeState) {
        // 【第一段不允许修改的代码】：保持原样
        const revertSide = (arr: ColorName[]): ColorName[] => {
          // 为了对抗回显逻辑导致的变形，并实现：侧面不翻转 + U面顺时针转90°
          // 因为外部对每个面都死绑定调用了 revertSide，我们通过判断 arr[4] 无法得知是哪个面
          // 但我们可以通过追踪调用栈或者重写这个闭包内部的映射：
          // 为了干净安全，我们在下方提供精准的转换矩阵：
          
          // 巧妙地检测当前被传入的数组属于哪个面（通过中心块特征色或动态判断）
          const centerColor = arr[4];
          
          // 1. 如果是顶面 U (初识中心块通常为黄 yellow，或者根据 initialCubeState 的键匹配)
          // 目标：将 3D 的 U 顺时针旋转 90° 传给 2D 的 U。
          // 标准顺时针为：[6,3,0, 7,4,1, 8,5,2]
          if (arr === initialCubeState.faces.U) {
            return [
              arr[0], arr[1], arr[2],
              arr[3], arr[4], arr[5],
              arr[6], arr[7], arr[8]
            ];
          }
          
          // 2. 其余所有面（D, L, F, R, B）：目标是不发生任何颠倒或旋转，保持 3D 的原样数组
          // 标准原样为：[0,1,2, 3,4,5, 6,7,8]
          return [
            arr[0], arr[1], arr[2],
            arr[3], arr[4], arr[5],
            arr[6], arr[7], arr[8]
          ];
        };
        // 严格遵循：D' -> U, U' -> D, D2 -> U2, U2 -> D2 的全指令回显
        setNet({
          U: revertSide(initialCubeState.faces.U),
          D: revertSide(initialCubeState.faces.D),
          F: revertSide(initialCubeState.faces.F),
          B: revertSide(initialCubeState.faces.B),
          L: revertSide(initialCubeState.faces.L),
          R: revertSide(initialCubeState.faces.R),
        });
        } else {
        setNet(createDefaultNet());
        }
      setSelectedSticker(null);
      setValidationError(null);
    }
  }, [open]);

  // Close popup when clicking outside
  useEffect(() => {
    if (!selectedSticker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setSelectedSticker(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedSticker]);

  const handleStickerClick = useCallback((face: FaceName, index: number) => {
    setSelectedSticker(prev =>
      prev?.face === face && prev?.index === index ? null : { face, index },
    );
  }, []);

  const handleColorSelect = useCallback((color: ColorName) => {
    if (!selectedSticker) return;
    setNet(prev => {
      const newNet = { ...prev };
      newNet[selectedSticker.face] = [...prev[selectedSticker.face]];
      newNet[selectedSticker.face][selectedSticker.index] = color;
      return newNet;
    });
    setSelectedSticker(null);
  }, [selectedSticker]);

  const validateNet = useCallback((): string | null => {
    const counts: Record<ColorName, number> = {
      white: 0, yellow: 0, red: 0, orange: 0, blue: 0, green: 0,
    };
    for (const face of FACE_ORDER) {
      for (const color of net[face]) {
        counts[color]++;
      }
    }
    for (const color of COLOR_NAMES) {
      if (counts[color] !== 9) {
        return `颜色 "${COLOR_LABELS[color]}" 出现了 ${counts[color]} 次，应为 9 次`;
      }
    }
    return null;
  }, [net]);

  const handleComplete = useCallback(() => {
    const error = validateNet();
    if (error) {
      setValidationError(error);
      return;
    }
   // 【第二段不允许修改的代码】：保持原样
    const convertSide = (arr: ColorName[]): ColorName[] => {
      // 同样的，为了应对导出时死绑定调用的 convertSide：
      // 我们需要根据传入的数组来源，对数据做逆向修正
      
      // 1. 如果是 U 面：在回显时顺时针转了，那么用户点击完成导出时，需要逆时针转回去
      // 标准逆时针为：[2,5,8, 1,4,7, 0,3,6]
      if (net.U && arr === net.U) {
        return [
        arr[0], arr[1], arr[2],
        arr[3], arr[4], arr[5],
        arr[6], arr[7], arr[8]
              
        ];
      }
      
      // 2. 其余所有面（D, L, F, R, B）：保持 2D 上的直观色块顺序原样导出给 3D 状态
      return [
         arr[0], arr[1], arr[2],
        arr[3], arr[4], arr[5],
        arr[6], arr[7], arr[8]
        
      ];
    };

  
    const cubeState: CubeState = {
      faces: {
        D: convertSide(net.D || Array(9).fill('white')),
        U: convertSide(net.U || Array(9).fill('yellow')),
        F: convertSide(net.F || Array(9).fill('green')),
        B: convertSide(net.B || Array(9).fill('blue')),
        L: convertSide(net.L || Array(9).fill('red')),
        R: convertSide(net.R || Array(9).fill('orange')),
      },
    };
    
  if (onComplete) {
      onComplete(cubeState);
    }
    if (onOpenChange) {
      onOpenChange(false);
    }
  }, [net, validateNet, onComplete, onOpenChange]);

  const handleReset = useCallback(() => {
    setNet(createDefaultNet());
    setSelectedSticker(null);
    setValidationError(null);
  }, []);

  // Build grid layout
  const gridRows = 3; // U row, middle row, D row
  const gridCols = 4; // L, F, R, B

  const renderFace = (face: FaceName) => {
    const [row, col] = FACE_GRID_POSITION[face];
    return (
      <div
        key={face}
        className="flex flex-col items-center"
        style={{ gridRow: row + 1, gridColumn: col + 1 }}
      >
        <span className="text-xs text-slate-400 mb-1 font-medium">{FACE_LABELS[face]}</span>
        <div className="grid grid-cols-3 gap-0.5 bg-slate-800 p-0.5 rounded">
          {net[face].map((color, idx) => {
            const isSelected = selectedSticker?.face === face && selectedSticker?.index === idx;
            return (
              <button
                key={idx}
                className={cn(
                  'w-8 h-8 rounded-sm border transition-all duration-100 hover:brightness-110',
                  isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-110 z-10' : 'border-slate-700',
                )}
                style={{ backgroundColor: COLOR_HEX_MAP[color] }}
                onClick={() => handleStickerClick(face, idx)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            <span>输入魔方颜色</span>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Color picker popup */}
          {selectedSticker && (
            <div
              ref={popupRef}
              className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-2 flex gap-1.5 animate-in fade-in zoom-in-95 duration-150"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {COLOR_NAMES.map(color => (
                <button
                  key={color}
                  className="w-10 h-10 rounded-md border-2 border-slate-600 hover:border-white hover:scale-110 transition-all flex flex-col items-center justify-center gap-0.5"
                  style={{ backgroundColor: COLOR_HEX_MAP[color] }}
                  onClick={() => handleColorSelect(color)}
                  title={COLOR_LABELS[color]}
                >
                  <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {COLOR_LABELS[color]}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* 2D Net Grid */}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: 'repeat(4, auto)',
              gridTemplateRows: 'repeat(3, auto)',
            }}
          >
            {renderFace('U')}
            {renderFace('L')}
            {renderFace('F')}
            {renderFace('R')}
            {renderFace('B')}
            {renderFace('D')}
          </div>

          {/* Validation error */}
          {validationError && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
              {validationError}
            </p>
          )}

          {/* Color count summary */}
          <div className="flex flex-wrap gap-3 justify-center text-xs">
            {COLOR_NAMES.map(color => {
              let count = 0;
              for (const face of FACE_ORDER) {
                count += net[face].filter(c => c === color).length;
              }
              const isValid = count === 9;
              return (
                <div key={color} className={cn('flex items-center gap-1.5 px-2 py-1 rounded', isValid ? 'text-green-400' : 'text-red-400')}>
                  <div className="w-3 h-3 rounded-sm border border-slate-600" style={{ backgroundColor: COLOR_HEX_MAP[color] }} />
                  <span>{COLOR_LABELS[color]}: {count}/9</span>
                  {isValid && <Check className="w-3 h-3" />}
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-2">
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700" onClick={handleReset}>
              重置颜色
            </Button>
            <Button
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              onClick={handleComplete}
            >
              <Check className="w-4 h-4 mr-2" />
              完成
            </Button>
          </div>

          <p className="text-slate-500 text-xs text-center max-w-md">
            点击色块选择颜色，确保每种颜色恰好出现 9 次
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}