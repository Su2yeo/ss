"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Line, Rect, Circle, Text, Image as KonvaImage, Transformer } from "react-konva";
import useImage from "use-image";
import type Konva from "konva";

import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/firebase/config";

// ==========================================
// 1. 타입 정의
// ==========================================
export type ItemType = "image" | "brush" | "eraser" | "rect" | "circle" | "line" | "text";

export interface MapItem {
  id: string;
  type: ItemType;
  url?: string;
  x: number;
  y: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  points?: number[];
  width?: number;
  height?: number;
  radius?: number;
  color?: string;
  text?: string;
}

export interface MapLayer {
  id: string;
  name: string;
  isLocked: boolean;
  items: MapItem[];
}

interface MapBoardCanvasProps {
  roomId: string;
  currentUser: { uid: string; displayName: string };
  isGM: boolean;
}

const GRID_SIZE = 50;
const GRID_EXTENT = 2000;
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;

// ==========================================
// 2. 렌더링 컴포넌트
// ==========================================
function ImageContent({ item, commonProps }: any) {
  const [image] = useImage(item.url || "");
  if (!image) return null;
  return <KonvaImage image={image} {...commonProps} />;
}

function ItemNode({ item, isLocked, canEdit, tool, isSelected, onSelect, onChange }: any) {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  // 🔥 잠긴 레이어는 드래그 불가
  const isDraggable = canEdit && !isLocked && tool === "cursor";

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const commonProps = {
    ref: shapeRef,
    x: item.x, y: item.y,
    scaleX: item.scaleX || 1, scaleY: item.scaleY || 1, rotation: item.rotation || 0,
    draggable: isDraggable,
    // 🔥 잠긴 레이어의 아이템은 클릭(선택)되지 않도록 방어 로직 추가
    onClick: (e: any) => { 
      e.cancelBubble = true; 
      if (tool === "cursor" && !isLocked) onSelect(item.id); 
    },
    onTap: (e: any) => { 
      e.cancelBubble = true; 
      if (tool === "cursor" && !isLocked) onSelect(item.id); 
    },
    onDragEnd: (e: any) => {
      onChange(item.id, { x: e.target.x(), y: e.target.y() });
    },
    onTransformEnd: (e: any) => {
      const node = shapeRef.current;
      onChange(item.id, {
        x: node.x(), y: node.y(),
        scaleX: Math.max(0.05, node.scaleX()), scaleY: Math.max(0.05, node.scaleY()), 
        rotation: node.rotation()
      });
    }
  };

  let node = null;
  if (item.type === "image") {
    node = <ImageContent item={item} commonProps={commonProps} />;
  } else if (item.type === "brush" || item.type === "eraser" || item.type === "line") {
    node = <Line {...commonProps} points={item.points || []} stroke={item.type === "eraser" ? "#18181b" : (item.color || "#ffffff")} strokeWidth={item.type === "eraser" ? 20 : 4} tension={item.type === "line" ? 0 : 0.5} lineCap="round" lineJoin="round" globalCompositeOperation={item.type === "eraser" ? "destination-out" : "source-over"} />;
  } else if (item.type === "rect") {
    node = <Rect {...commonProps} width={item.width || 100} height={item.height || 100} stroke={item.color || "#ffffff"} strokeWidth={4} />;
  } else if (item.type === "circle") {
    node = <Circle {...commonProps} radius={item.radius || 50} stroke={item.color || "#ffffff"} strokeWidth={4} />;
  } else if (item.type === "text") {
    node = <Text {...commonProps} text={item.text} fill={item.color || "#ffffff"} fontSize={24} fontStyle="bold" />;
  }

  return (
    <>
      {node}
      {isSelected && <Transformer ref={trRef} keepRatio={item.type === 'image' || item.type === 'circle'} />}
    </>
  );
}

// ==========================================
// 3. 메인 맵 컴포넌트
// ==========================================
export default function MapBoardCanvas({ roomId, currentUser, isGM }: MapBoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const [layers, setLayers] = useState<MapLayer[]>([
    { id: "tokens", name: "토큰", isLocked: false, items: [] },
    { id: "bg", name: "배경", isLocked: false, items: [] },
  ]);
  const [activeLayerId, setActiveLayerId] = useState("bg");
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null); 
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tool, setTool] = useState<"cursor" | ItemType>("cursor");
  const [strokeColor, setStrokeColor] = useState("#ffffff");
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<MapItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(doc(db, "rooms", roomId), (docSnap) => {
      const data = docSnap.data();
      if (data?.mapLayers) setLayers(data.mapLayers);
    });
    return () => unsub();
  }, [roomId]);

  const saveLayers = async (newLayers: MapLayer[]) => {
    setLayers(newLayers);
    await updateDoc(doc(db, "rooms", roomId), { mapLayers: newLayers });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && tool === "cursor") {
        saveLayers(layers.map(l => ({ ...l, items: l.items.filter(i => i.id !== selectedId) })));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, layers, tool]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return;
    const oldScale = scale;
    const mousePointTo = { x: (pointer.x - stagePos.x) / oldScale, y: (pointer.y - stagePos.y) / oldScale };
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, e.evt.deltaY > 0 ? oldScale / 1.05 : oldScale * 1.05));
    setScale(newScale);
    setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
  }, [scale, stagePos]);

  const getRelativePointerPosition = () => {
    const node = stageRef.current;
    if (!node) return { x: 0, y: 0 };
    const transform = node.getAbsoluteTransform().copy();
    transform.invert();
    const pos = node.getPointerPosition();
    return pos ? transform.point(pos) : { x: 0, y: 0 };
  };

  const handlePointerDown = (e: any) => {
    if (e.target === stageRef.current) setSelectedId(null);
    if (tool === "cursor") return;
    setSelectedId(null); 
    const pos = getRelativePointerPosition();
    setIsDrawing(true);

    if (tool === "text") {
      const text = prompt("입력할 텍스트를 적어주세요:");
      if (text) {
        const newItem: MapItem = { id: Date.now().toString(), type: "text", x: pos.x, y: pos.y, text, color: strokeColor };
        saveLayers(layers.map(l => l.id === activeLayerId ? { ...l, items: [...l.items, newItem] } : l));
      }
      setIsDrawing(false);
      return;
    }
    setCurrentShape({ id: Date.now().toString(), type: tool, x: pos.x, y: pos.y, points: [0, 0], width: 0, height: 0, radius: 0, color: strokeColor });
  };

  const handlePointerMove = (e: any) => {
    if (!isDrawing || tool === "cursor" || !currentShape) return;
    const pos = getRelativePointerPosition();
    setCurrentShape((prev) => {
      if (!prev) return prev;
      const newShape = { ...prev };
      if (tool === "brush" || tool === "eraser" || tool === "line") {
        newShape.points = tool === "line" ? [0, 0, pos.x - prev.x, pos.y - prev.y] : [...(prev.points || []), pos.x - prev.x, pos.y - prev.y];
      } else if (tool === "rect") {
        newShape.width = pos.x - prev.x; newShape.height = pos.y - prev.y;
      } else if (tool === "circle") {
        newShape.radius = Math.hypot(pos.x - prev.x, pos.y - prev.y);
      }
      return newShape;
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing || tool === "cursor") return;
    setIsDrawing(false);
    if (currentShape) {
      saveLayers(layers.map(l => l.id === activeLayerId ? { ...l, items: [...l.items, currentShape] } : l));
      setCurrentShape(null);
    }
  };

  const handleLayerDrop = (e: any, targetId: string) => {
    e.preventDefault();
    if (!draggedLayerId || draggedLayerId === targetId) return;
    const oldIdx = layers.findIndex(l => l.id === draggedLayerId);
    const newIdx = layers.findIndex(l => l.id === targetId);
    const newLayers = [...layers];
    const [removed] = newLayers.splice(oldIdx, 1);
    newLayers.splice(newIdx, 0, removed);
    saveLayers(newLayers);
    setDraggedLayerId(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fileRef = ref(storage, `rooms/${roomId}/map_${Date.now()}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      const centerX = (size.width / 2 - stagePos.x) / scale;
      const centerY = (size.height / 2 - stagePos.y) / scale;
      const newItem: MapItem = { id: Date.now().toString(), type: "image", url, x: centerX, y: centerY };
      saveLayers(layers.map(l => l.id === activeLayerId ? { ...l, items: [...l.items, newItem] } : l));
    } catch (error) { alert("이미지 업로드에 실패했습니다."); } 
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const addLayer = () => {
    const name = prompt("새 레이어 이름:", `레이어 ${layers.length + 1}`);
    if (!name) return;
    saveLayers([{ id: Date.now().toString(), name, isLocked: false, items: [] }, ...layers]);
  };

  const gridLines = [];
  for (let i = -GRID_EXTENT; i <= GRID_EXTENT; i += GRID_SIZE) {
    gridLines.push(<Line key={`v${i}`} points={[i, -GRID_EXTENT, i, GRID_EXTENT]} stroke="#3f3f46" strokeWidth={1} />);
    gridLines.push(<Line key={`h${i}`} points={[-GRID_EXTENT, i, GRID_EXTENT, i]} stroke="#3f3f46" strokeWidth={1} />);
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-zinc-950 overflow-hidden touch-none">
      
      {size.width > 0 && (
        <Stage
          ref={stageRef} width={size.width} height={size.height}
          x={stagePos.x} y={stagePos.y} scaleX={scale} scaleY={scale}
          draggable={tool === "cursor" && !selectedId} 
          onWheel={handleWheel}
          onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp}
          onDragEnd={(e) => { if (e.target === stageRef.current) setStagePos({ x: e.target.x(), y: e.target.y() }); }}
        >
          <Layer>{gridLines}</Layer>
          {layers.slice().reverse().map((layer) => (
            <Layer key={layer.id}>
              {layer.items.map((item) => (
                <ItemNode
                  key={item.id} item={item} isLocked={layer.isLocked} canEdit={isGM} tool={tool}
                  isSelected={item.id === selectedId}
                  onSelect={(id: string) => setSelectedId(id)}
                  onChange={(id: string, newProps: any) => saveLayers(layers.map(l => l.id === layer.id ? { ...l, items: l.items.map(i => i.id === id ? { ...i, ...newProps } : i) } : l))}
                />
              ))}
            </Layer>
          ))}
          {currentShape && (
            <Layer><ItemNode item={currentShape} isLocked={false} canEdit={false} tool={tool} isSelected={false} onSelect={()=>{}} onChange={()=>{}} /></Layer>
          )}
        </Stage>
      )}

      {isGM && (
        <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 select-none">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl transition-all z-50 border-2 ${isMenuOpen ? "bg-zinc-800 border-zinc-600 text-white" : "bg-indigo-600 border-indigo-400 text-white hover:bg-indigo-500 hover:scale-105"}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          </button>

          {isMenuOpen && (
            <div className="w-72 bg-zinc-900/95 border border-zinc-700 rounded-xl shadow-2xl p-4 flex flex-col gap-4 backdrop-blur-sm">
              
              <div>
                <h3 className="text-xs font-bold text-zinc-400 mb-2">도구</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "cursor", icon: <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /> },
                    { id: "brush", icon: <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /> },
                    // 🔥 지우개 툴 아이콘을 진짜 지우개 모양으로 교체
                    { id: "eraser", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 13.5L9 20h9L21.5 9.5a2.12 2.12 0 000-3l-4-4a2.12 2.12 0 00-3 0L2.5 13.5zm0 0l6 6M10.5 8.5l6 6" /> },
                    { id: "rect", icon: <path d="M4 6h16v12H4z" /> },
                    { id: "circle", icon: <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
                    { id: "line", icon: <path d="M4 20L20 4" /> },
                    { id: "text", icon: <path d="M4 7V4h16v3M9 20h6M12 4v16" /> },
                  ].map((t) => (
                    <button
                      key={t.id} onClick={() => setTool(t.id as any)}
                      className={`p-2 rounded-lg border transition-all ${tool === t.id ? "bg-indigo-600 border-indigo-400 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white"}`}
                      title={t.id}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">{t.icon}</svg>
                    </button>
                  ))}
                  <div className="flex items-center ml-auto border border-zinc-700 rounded-lg p-1 bg-zinc-800">
                    <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0" />
                  </div>
                </div>
              </div>

              {/* 🔥 삭제 버튼 (쓰레기통 -> 지우개 아이콘으로 변경) */}
              {selectedId && (
                <div className="border-t border-zinc-700 pt-3">
                  <button 
                    onClick={() => {
                      saveLayers(layers.map(l => ({ ...l, items: l.items.filter(i => i.id !== selectedId) })));
                      setSelectedId(null);
                    }}
                    className="w-full py-1.5 bg-red-900/40 border border-red-900/50 hover:bg-red-800 text-red-100 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.5 13.5L9 20h9L21.5 9.5a2.12 2.12 0 000-3l-4-4a2.12 2.12 0 00-3 0L2.5 13.5zm0 0l6 6M10.5 8.5l6 6" />
                    </svg>
                    선택된 아이템 지우기 (Del)
                  </button>
                </div>
              )}

              <div className="border-t border-zinc-700" />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-zinc-400">레이어</h3>
                  <button onClick={addLayer} className="p-1 text-zinc-400 hover:text-white bg-zinc-800 rounded hover:bg-zinc-700 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
                
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                  {layers.map((layer) => (
                    <div 
                      key={layer.id} 
                      draggable
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDraggedLayerId(layer.id); }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleLayerDrop(e, layer.id)}
                      onClick={() => setActiveLayerId(layer.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${activeLayerId === layer.id ? "bg-indigo-600/20 border-indigo-500 text-indigo-100" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="cursor-grab text-zinc-600 hover:text-zinc-400" title="드래그하여 순서 변경">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                        </span>
                        <span className="text-xs font-semibold truncate w-24">{layer.name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            // 🔥 레이어가 잠길 때, 현재 선택된 아이템이 이 레이어에 있다면 선택을 강제 해제합니다.
                            if (!layer.isLocked && selectedId && layer.items.some(i => i.id === selectedId)) {
                              setSelectedId(null);
                            }
                            saveLayers(layers.map(l => l.id === layer.id ? { ...l, isLocked: !l.isLocked } : l)); 
                          }}
                          className={`p-1.5 rounded transition-colors ${layer.isLocked ? "text-red-400 bg-red-900/30" : "text-zinc-500 hover:text-white hover:bg-zinc-700"}`}
                        >
                          {layer.isLocked 
                            ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                          }
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); if(confirm("레이어를 삭제하시겠습니까?")) { const newL = layers.filter(l => l.id !== layer.id); saveLayers(newL); setActiveLayerId(newL[0]?.id); } }} className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-700" />

              <div>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isUploading || layers.find(l => l.id === activeLayerId)?.isLocked}
                  className="w-full py-2 bg-zinc-800 border border-zinc-600 hover:bg-zinc-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  {isUploading ? "업로드 중..." : "이미지 추가"}
                </button>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}