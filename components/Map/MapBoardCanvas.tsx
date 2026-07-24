"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Line, Rect, Circle, Text, Image as KonvaImage, Transformer } from "react-konva";
import useImage from "use-image";
import type Konva from "konva";

import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/firebase/config";
import type { SavedScene, MapAsset } from "@/types/room";

export type ItemType = "image" | "brush" | "eraser" | "rect" | "circle" | "line" | "text";

export interface MapItem {
  id: string; type: ItemType; url?: string;
  x: number; y: number; scaleX?: number; scaleY?: number; rotation?: number;
  points?: number[]; width?: number; height?: number; radius?: number; color?: string; text?: string;
}

export interface MapLayer {
  id: string; name: string; isLocked: boolean; isVisible?: boolean; items: MapItem[];
}

interface MapBoardCanvasProps {
  roomId: string; currentUser: { uid: string; displayName: string }; isGM: boolean;
}

const GRID_SIZE = 50;
const GRID_EXTENT = 2000;
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;

// 🔥 아이템과 트랜스포머(선택 박스)를 완벽하게 동기화하도록 수정된 노드 컴포넌트
function ItemNode({ item, layerId, isLocked, canEdit, tool, isSelected, onSelect, onChange }: any) {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const isDraggable = canEdit && !isLocked && tool === "cursor";

  // 🔥 이미지를 여기서 로드하여, 로드가 완료되었을 때 파란 박스가 씌워지도록 추적합니다.
  const [image] = useImage(item.type === "image" ? (item.url || "") : "", "anonymous");

  // 아이템이 선택되거나 이미지가 뒤늦게 로딩되었을 때 트랜스포머 업데이트
  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected, image, item.x, item.y, item.scaleX, item.scaleY, item.rotation]);

  const handleSelect = (e: any) => {
    e.cancelBubble = true; // 맵 캔버스 빈 공간 클릭으로 인식되지 않도록 차단
    if (tool === "cursor" && !isLocked) {
      onSelect(item.id, layerId);
    }
  };

  const commonProps = {
    ref: shapeRef,
    x: item.x, y: item.y,
    scaleX: item.scaleX || 1, scaleY: item.scaleY || 1, rotation: item.rotation || 0,
    draggable: isDraggable,
    // 🔥 onClick 대신 onMouseDown을 사용하여 클릭 즉시(딜레이 없이) 선택되도록 강화
    onMouseDown: handleSelect,
    onTouchStart: handleSelect,
    onDragStart: handleSelect,
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
    if (!image) return null; // 로딩 중에는 파란 박스가 헛돌지 않도록 대기
    node = <KonvaImage image={image} {...commonProps} />;
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

export default function MapBoardCanvas({ roomId, currentUser, isGM }: MapBoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const [layers, setLayers] = useState<MapLayer[]>([
    { id: "tokens", name: "토큰", isLocked: false, isVisible: true, items: [] },
    { id: "bg", name: "배경", isLocked: false, isVisible: true, items: [] },
  ]);
  
  const layersRef = useRef(layers);
  useEffect(() => { layersRef.current = layers; }, [layers]);

  const [assets, setAssets] = useState<MapAsset[]>([]);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeLayerId, setActiveLayerId] = useState("bg");
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null); 
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tool, setTool] = useState<"cursor" | ItemType>("cursor");
  const [strokeColor, setStrokeColor] = useState("#ffffff");
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<MapItem | null>(null);

  const [isPanning, setIsPanning] = useState(false);

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
      if (data?.assets) setAssets(data.assets); 
    });
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    const handleRequestSaveScene = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { sceneName, sceneId } = customEvent.detail;
      if (!stageRef.current) return;
      try {
        const dataURL = stageRef.current.toDataURL({ mimeType: "image/jpeg", quality: 0.8, pixelRatio: 0.3 });
        const res = await fetch(dataURL);
        const blob = await res.blob();
        const fileRef = ref(storage, `rooms/${roomId}/thumbs/${sceneId}.jpg`);
        await uploadBytes(fileRef, blob);
        const thumbUrl = await getDownloadURL(fileRef);
        const newScene: SavedScene = { id: sceneId, name: sceneName, mapLayers: layersRef.current, thumbnailUrl: thumbUrl };
        window.dispatchEvent(new CustomEvent("sceneDataReady", { detail: { newScene } }));
      } catch (error) {
        const newScene: SavedScene = { id: sceneId, name: sceneName, mapLayers: layersRef.current };
        window.dispatchEvent(new CustomEvent("sceneDataReady", { detail: { newScene } }));
      }
    };
    window.addEventListener("requestSaveScene", handleRequestSaveScene);
    return () => window.removeEventListener("requestSaveScene", handleRequestSaveScene);
  }, [roomId]);

  const saveLayers = async (newLayers: MapLayer[]) => {
    setLayers(newLayers);
    await updateDoc(doc(db, "rooms", roomId), { mapLayers: newLayers });
  };
// 🔥 Space 키 눌림 상태를 추적하는 Ref 추가
  const isSpacePressed = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력창(input, textarea)에서 타자 치는 중일 때는 스페이스바 맵 이동 방지
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault(); // 스페이스바로 화면 스크롤이 내려가는 현상 방지
        isSpacePressed.current = true;
        if (containerRef.current) containerRef.current.style.cursor = "grab";
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && tool === "cursor") {
        saveLayers(layers.map(l => ({ ...l, items: l.items.filter(i => i.id !== selectedId) })));
        setSelectedId(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressed.current = false;
        if (containerRef.current) containerRef.current.style.cursor = "default";
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
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
    // 🔥 휠 클릭이거나 Space 키를 누른 상태일 경우 오브젝트 무시하고 화면 드래그만 활성화
    if ((e.evt && e.evt.button === 1) || isSpacePressed.current) {
      setIsPanning(true);
      if (containerRef.current) containerRef.current.style.cursor = "grabbing";
      return;
    }

    if (e.target === stageRef.current) setSelectedId(null);
    if (tool === "cursor") return;
    setSelectedId(null); 
    const pos = getRelativePointerPosition();
    setIsDrawing(true);
// ... (이하 기존 코드 동일)

    if (tool === "text") {
      const text = prompt("입력할 텍스트를 적어주세요:");
      if (text) {
        const newItem: MapItem = { id: Date.now().toString(), type: "text", x: pos.x, y: pos.y, text, color: strokeColor };
        saveLayers(layers.map(l => l.id === activeLayerId ? { ...l, items: [...l.items, newItem] } : l));
        setSelectedId(newItem.id); 
      }
      setIsDrawing(false);
      return;
    }
    setCurrentShape({ id: Date.now().toString(), type: tool, x: pos.x, y: pos.y, points: [0, 0], width: 0, height: 0, radius: 0, color: strokeColor });
  };

  const handlePointerMove = (e: any) => {
    // 🔥 화면 휠 드래그 이동 처리
    if (isPanning && e.evt) {
      setStagePos(prev => ({ x: prev.x + e.evt.movementX, y: prev.y + e.evt.movementY }));
      return;
    }

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
    if (isPanning) {
      setIsPanning(false);
      if (containerRef.current) containerRef.current.style.cursor = "default";
      return;
    }
    if (!isDrawing || tool === "cursor") return;
    setIsDrawing(false);
    if (currentShape) {
      saveLayers(layers.map(l => l.id === activeLayerId ? { ...l, items: [...l.items, currentShape] } : l));
      setSelectedId(currentShape.id);
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

  const handleUploadToGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fileRef = ref(storage, `rooms/${roomId}/assets_${Date.now()}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      
      const newAsset: MapAsset = {
        id: Date.now().toString(), name: file.name, url, uploadedBy: currentUser.uid
      };
      await updateDoc(doc(db, "rooms", roomId), { assets: [...assets, newAsset] });
    } catch (error) { alert("서버에 이미지를 등록하는 데 실패했습니다."); } 
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleAddAssetToMap = (asset: MapAsset) => {
    const centerX = (size.width / 2 - stagePos.x) / scale;
    const centerY = (size.height / 2 - stagePos.y) / scale;
    const newItem: MapItem = { id: Date.now().toString(), type: "image", url: asset.url, x: centerX, y: centerY };
    
    saveLayers(layers.map(l => l.id === activeLayerId ? { ...l, items: [...l.items, newItem] } : l));
    setSelectedId(newItem.id); // 추가한 이미지가 즉시 선택됩니다!
    setIsAssetModalOpen(false); 
  };

  const addLayer = () => {
    const name = prompt("새 레이어 이름:", `레이어 ${layers.length + 1}`);
    if (!name) return;
    saveLayers([{ id: Date.now().toString(), name, isLocked: false, isVisible: true, items: [] }, ...layers]);
  };

  const gridLines = [];
  for (let i = -GRID_EXTENT; i <= GRID_EXTENT; i += GRID_SIZE) {
    gridLines.push(<Line key={`v${i}`} points={[i, -GRID_EXTENT, i, GRID_EXTENT]} stroke="#3f3f46" strokeWidth={1} />);
    gridLines.push(<Line key={`h${i}`} points={[-GRID_EXTENT, i, GRID_EXTENT, i]} stroke="#3f3f46" strokeWidth={1} />);
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-zinc-950 overflow-hidden touch-none" onContextMenu={(e) => e.preventDefault()}>
      
      {size.width > 0 && (
        <Stage
          ref={stageRef} width={size.width} height={size.height}
          x={stagePos.x} y={stagePos.y} scaleX={scale} scaleY={scale}
          draggable={tool === "cursor" && !selectedId} // 🔥 빈 공간 좌클릭 시 맵 전체 이동
          onWheel={handleWheel}
          onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp}
          onDragEnd={(e) => { if (e.target === stageRef.current) setStagePos({ x: e.target.x(), y: e.target.y() }); }}
        >
          <Layer>{gridLines}</Layer>
          {layers.slice().reverse().map((layer) => (
            <Layer key={layer.id} visible={layer.isVisible !== false}>
              {layer.items.map((item) => (
                <ItemNode
                  key={item.id} item={item} layerId={layer.id} isLocked={layer.isLocked} canEdit={isGM} tool={tool}
                  isSelected={item.id === selectedId}
                  onSelect={(id: string, lId: string) => { setSelectedId(id); setActiveLayerId(lId); }}
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
        <div className="absolute top-4 left-4 z-40 flex flex-col gap-2 select-none">
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newName = prompt("레이어 이름을 변경하세요:", layer.name);
                            if (newName && newName.trim()) {
                              saveLayers(layers.map(l => l.id === layer.id ? { ...l, name: newName.trim() } : l));
                            }
                          }}
                          className={`text-xs font-semibold truncate w-20 text-left hover:underline ${activeLayerId === layer.id ? 'text-white' : 'text-zinc-300'}`}
                          title="이름 변경"
                        >
                          {layer.name}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            saveLayers(layers.map(l => l.id === layer.id ? { ...l, isVisible: l.isVisible === false ? true : false } : l));
                          }}
                          className={`p-1.5 rounded transition-colors ${layer.isVisible === false ? "text-zinc-600 hover:text-zinc-400" : "text-zinc-400 hover:text-white hover:bg-zinc-700"}`}
                        >
                          {layer.isVisible === false ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          )}
                        </button>
                        
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (!layer.isLocked && selectedId && layer.items.some(i => i.id === selectedId)) setSelectedId(null);
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
                <button 
                  onClick={() => setIsAssetModalOpen(true)}
                  disabled={layers.find(l => l.id === activeLayerId)?.isLocked}
                  className="w-full py-2 bg-zinc-800 border border-zinc-600 hover:bg-zinc-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  에셋 갤러리 열기
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isAssetModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-[600px] max-w-full flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h3 className="text-lg font-bold text-white">🖼️ 서버 에셋 갤러리</h3>
              <button onClick={() => setIsAssetModalOpen(false)} className="text-zinc-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto max-h-[60vh]">
              {assets.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-sm">
                  서버에 등록된 이미지가 없습니다.<br/>새 이미지를 업로드해 보세요!
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {assets.map(asset => (
                    <div 
                      key={asset.id} 
                      onClick={() => handleAddAssetToMap(asset)}
                      className="group relative aspect-square bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors"
                    >
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:opacity-60 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">+ 맵에 추가</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleUploadToGallery} className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isUploading ? "업로드 중..." : "☁️ 새 이미지 서버에 등록하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}