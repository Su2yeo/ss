"use client";

import { useState, useEffect } from "react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { RoomInfo, SavedScene } from "@/types/room";

interface TextMacro {
  id: string; name: string; content: string;
}

interface GMSidebarProps {
  roomId: string;
  room: RoomInfo & { textMacros?: TextMacro[], savedScenes?: SavedScene[] };
}

export function GMSidebar({ roomId, room }: GMSidebarProps) {
  const { sendMessage } = useChatMessages(roomId);
  
  const [newMacroName, setNewMacroName] = useState("");
  const [newMacroContent, setNewMacroContent] = useState("");
  const [isSavingMacro, setIsSavingMacro] = useState(false);
  const [isSavingScene, setIsSavingScene] = useState(false);
  
  // 🔥 장면 이름 그 자리에서 바로 수정을 위한 기능 추가
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editSceneNameInput, setEditSceneNameInput] = useState("");
  
  // =======================================================
  // [A] 텍스트 매크로 기능
  // =======================================================
  const handleSendMacro = async (content: string) => {
    await sendMessage({ type: "system", authorId: "system", authorName: "SYSTEM", content, category: "main" });
  };

  const handleAddMacro = async () => {
    if (!newMacroName.trim() || !newMacroContent.trim()) return alert("입력해주세요.");
    setIsSavingMacro(true);
    try {
      const newMacro: TextMacro = { id: Date.now().toString(), name: newMacroName.trim(), content: newMacroContent.trim() };
      await updateDoc(doc(db, "rooms", roomId), { textMacros: [...(room.textMacros || []), newMacro] });
      setNewMacroName(""); setNewMacroContent("");
    } catch (error) { alert("매크로 등록 실패."); } finally { setIsSavingMacro(false); }
  };

  const handleDeleteMacro = async (macroId: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await updateDoc(doc(db, "rooms", roomId), { textMacros: (room.textMacros || []).filter(m => m.id !== macroId) });
  };

  // =======================================================
  // [B] 맵 장면(Scene) 저장 / 덮어쓰기 / 불러오기 기능
  // =======================================================
  
  useEffect(() => {
    const handleSceneReady = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { newScene } = customEvent.detail;
      try {
        const currentScenes = room.savedScenes || [];
        // 🔥 기존에 있는 장면인지 확인 (덮어쓰기 판별)
        const existingIndex = currentScenes.findIndex(s => s.id === newScene.id);
        
        let updatedScenes;
        if (existingIndex >= 0) {
          // 덮어쓰기
          updatedScenes = [...currentScenes];
          updatedScenes[existingIndex] = newScene;
        } else {
          // 새로 추가
          updatedScenes = [...currentScenes, newScene];
        }

        await updateDoc(doc(db, "rooms", roomId), {
          savedScenes: updatedScenes
        });
      } catch (error) {
        alert("장면 저장에 실패했습니다.");
      } finally {
        setIsSavingScene(false);
      }
    };
    
    window.addEventListener("sceneDataReady", handleSceneReady);
    return () => window.removeEventListener("sceneDataReady", handleSceneReady);
  }, [roomId, room.savedScenes]);

  // 새 장면으로 저장
  const handleSaveCurrentScene = () => {
    const sceneName = prompt("현재 맵 세팅을 저장할 이름을 입력하세요:", "새 장면");
    if (!sceneName) return;

    setIsSavingScene(true);
    window.dispatchEvent(new CustomEvent("requestSaveScene", { detail: { sceneName, sceneId: Date.now().toString() } }));
  };

  // 🔥 기존 장면 덮어쓰기 (확인 팝업창 제거)
  const handleOverwriteScene = (scene: SavedScene) => {
    setIsSavingScene(true);
    window.dispatchEvent(new CustomEvent("requestSaveScene", { detail: { sceneName: scene.name, sceneId: scene.id } }));
  };

  // 🔥 연필 버튼을 눌렀을 때, 글자 수정 모드로 변환하는 기능
  const startEditingSceneName = (sceneId: string, currentName: string) => {
    setEditingSceneId(sceneId);
    setEditSceneNameInput(currentName);
  };

  // 🔥 엔터키 등을 눌러 수정한 이름을 저장하는 기능
  const saveEditedSceneName = async (sceneId: string) => {
    if (!editSceneNameInput.trim()) {
      setEditingSceneId(null);
      return;
    }
    await updateDoc(doc(db, "rooms", roomId), { 
      savedScenes: (room.savedScenes || []).map(s => s.id === sceneId ? { ...s, name: editSceneNameInput.trim() } : s) 
    });
    setEditingSceneId(null); // 수정 모드 종료
  };

  const handleLoadScene = async (scene: SavedScene) => {
    if (!confirm(`'${scene.name}' 장면을 불러오시겠습니까?\n현재 맵 상태는 덮어씌워집니다.`)) return;
    try {
      await updateDoc(doc(db, "rooms", roomId), { mapLayers: scene.mapLayers });
      // 🔥 텍스트 대신 구불구불한 물결표 픽토그램으로 변경
      await sendMessage({ type: "system", authorId: "system", authorName: "SYSTEM", content: `〰️〰️〰️`, category: "main" });
    } catch (error) { alert("장면 불러오기 실패."); }
  };

  // 🔥 삭제 기능 (확인 팝업창 제거)
  const handleDeleteScene = async (sceneId: string) => {
    await updateDoc(doc(db, "rooms", roomId), { savedScenes: (room.savedScenes || []).filter(s => s.id !== sceneId) });
  };

  const displayMacros = room.textMacros || [];
  const displayScenes = room.savedScenes || [];

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col p-4 overflow-y-auto text-zinc-100 border-l border-amber-900/30 gap-6">
      <h2 className="text-xl font-bold text-amber-500 flex items-center gap-2 shrink-0">
        <span>👑</span> GM 컨트롤 패널
      </h2>

      {/* 1. 맵 장면 관리 영역 */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 mb-3 border-b border-zinc-800 pb-2">🗺️ 맵 장면 보관함</h3>
        
        <button 
          onClick={handleSaveCurrentScene} 
          disabled={isSavingScene}
          className="w-full mb-3 bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-bold py-2.5 rounded-lg border border-dashed border-amber-700/50 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {isSavingScene ? "저장 중..." : "📸 현재 맵 세팅 새 장면으로 저장"}
        </button>

        {displayScenes.length === 0 ? (
          <div className="text-center py-5 text-xs text-zinc-600 border border-dashed border-zinc-800 rounded-lg">
            저장된 장면이 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayScenes.map((scene) => (
              <div key={scene.id} className="flex flex-col bg-zinc-900 rounded-lg border border-zinc-700 overflow-hidden group shadow-sm">
                
                <div className="flex items-center gap-2 p-2 border-b border-zinc-800">
                  <div className="w-16 h-12 bg-black rounded flex items-center justify-center overflow-hidden shrink-0 border border-zinc-700/50 p-0.5">
                    {scene.thumbnailUrl ? (
                      <img src={scene.thumbnailUrl} alt="미리보기" className="w-full h-full object-contain opacity-90" />
                    ) : (
                      <span className="text-[9px] text-zinc-600 font-bold">이미지 없음</span>
                    )}
                  </div>
                  
                  {/* 🔥 이름 텍스트 또는 입력창 표시 */}
                  {editingSceneId === scene.id ? (
                    <input
                      type="text"
                      value={editSceneNameInput}
                      onChange={(e) => setEditSceneNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditedSceneName(scene.id);
                        if (e.key === 'Escape') setEditingSceneId(null);
                      }}
                      onBlur={() => saveEditedSceneName(scene.id)} // 마우스가 밖을 클릭해도 자동 저장
                      className="text-xs font-bold text-zinc-300 bg-zinc-950 border border-amber-500 rounded px-1 flex-1 min-w-0 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="text-xs font-bold text-zinc-300 truncate flex-1">{scene.name}</span>
                  )}
                  
                  {/* 🔥 아이콘 버튼 (이름변경 버튼의 작동 방식 변경) */}
                  <div className="flex flex-row gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                    <button 
                      onClick={() => startEditingSceneName(scene.id, scene.name)} 
                      className="text-zinc-400 hover:text-white transition-colors shrink-0"
                      title="이름변경"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button 
                      onClick={() => handleOverwriteScene(scene)} 
                      className="text-amber-500 hover:text-amber-400 transition-colors shrink-0"
                      title="덮어쓰기"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    </button>
                    <button 
                      onClick={() => handleDeleteScene(scene.id)} 
                      className="text-red-500 hover:text-red-400 transition-colors shrink-0"
                      title="삭제"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleLoadScene(scene)} 
                  className="w-full py-2 bg-zinc-800 border-t border-zinc-700 hover:bg-amber-900/30 text-amber-500 hover:text-amber-400 text-xs font-bold transition-colors"
                >
                  이 장면으로 맵 변경 🚀
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. 텍스트 매크로 영역 */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 mb-3 border-b border-zinc-800 pb-2">📝 텍스트 매크로</h3>
        <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 mb-3 flex flex-col gap-2">
          <input
            type="text"
            value={newMacroName}
            onChange={(e) => setNewMacroName(e.target.value)}
            placeholder="매크로 이름"
            className="w-full bg-zinc-950 text-xs px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-amber-500 text-white"
          />
          <textarea
            value={newMacroContent}
            onChange={(e) => setNewMacroContent(e.target.value)}
            placeholder="상황 묘사, 대사 등을 입력하세요..."
            rows={3}
            className="w-full bg-zinc-950 text-xs px-3 py-2 rounded border border-zinc-700 focus:outline-none focus:border-amber-500 resize-none text-white leading-relaxed"
          />
          <button 
            onClick={handleAddMacro} 
            disabled={isSavingMacro || !newMacroName.trim() || !newMacroContent.trim()}
            className="w-full bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold py-2 rounded transition-colors disabled:opacity-50 mt-1"
          >
            {isSavingMacro ? "등록 중..." : "+ 새 매크로 등록"}
          </button>
        </div>
        {displayMacros.length === 0 ? (
          <div className="text-center py-5 text-xs text-zinc-600 border border-dashed border-zinc-800 rounded-lg">등록된 텍스트 매크로가 없습니다.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayMacros.map((macro) => (
              <div key={macro.id} className="flex flex-col bg-zinc-900 rounded-lg border border-zinc-700 overflow-hidden group shadow-sm">
                <div className="flex items-center justify-between p-2 bg-zinc-800/80 border-b border-zinc-700">
                  <span className="text-xs font-bold text-amber-400 truncate pl-1">{macro.name}</span>
                  <button onClick={() => handleDeleteMacro(macro.id)} className="px-1.5 py-0.5 bg-red-900/60 hover:bg-red-700 text-white rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">삭제</button>
                </div>
                <div className="p-2.5 text-xs text-zinc-300 whitespace-pre-wrap max-h-32 overflow-y-auto bg-zinc-900/50 leading-relaxed scrollbar-hide">{macro.content}</div>
                <button onClick={() => handleSendMacro(macro.content)} className="w-full py-2 bg-zinc-800 border-t border-zinc-700 hover:bg-amber-900/50 text-amber-500 hover:text-amber-400 text-xs font-bold transition-colors">전송하기 🚀</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}