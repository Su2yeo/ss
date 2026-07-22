"use client";

import { useState, useRef } from "react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { db, storage } from "@/firebase/config";
import type { RoomInfo } from "@/types/room";

interface GMSidebarProps {
  roomId: string;
  room: RoomInfo & { sceneMacros?: { id: string; name: string; url: string }[] };
}

export function GMSidebar({ roomId, room }: GMSidebarProps) {
  const { sendMessage } = useChatMessages(roomId);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMacroId, setEditingMacroId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  // =======================================================
  // 🔥 1. 장면 매크로 채팅창 전송 (텍스트 제거, 이미지만 렌더링)
  // =======================================================
  const handleSceneMacro = async (sceneName: string, imageUrl: string) => {
    // 이전 코드: const content = `🎬 장면 전환: [${sceneName}]\n[img](${imageUrl})`;
    const content = `[img](${imageUrl})`; 
    
    await sendMessage({
      type: "system",
      authorId: "system",
      authorName: "SYSTEM",
      content: content,
    });
  };

  // 2. 새 장면 이미지 업로드 및 등록
  const handleAddScene = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileRef = ref(storage, `rooms/${roomId}/macros_${Date.now()}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      
      const sceneName = prompt("장면의 이름을 입력하세요:", "새 장면") || "새 장면";
      const newMacro = { id: Date.now().toString(), name: sceneName, url };
      
      const currentMacros = room.sceneMacros || [];
      await updateDoc(doc(db, "rooms", roomId), { 
        sceneMacros: [...currentMacros, newMacro] 
      });
    } catch (error) {
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 3. 장면 이름 수정
  const handleEditSceneName = async (macroId: string, currentName: string) => {
    const newName = prompt("새로운 장면 이름을 입력하세요:", currentName);
    if (!newName || newName === currentName) return;
    
    const currentMacros = room.sceneMacros || [];
    const updatedMacros = currentMacros.map(m => m.id === macroId ? { ...m, name: newName } : m);
    await updateDoc(doc(db, "rooms", roomId), { sceneMacros: updatedMacros });
  };

  // 4. 장면 이미지 수정 (직접 업로드)
  const handleEditSceneImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingMacroId) return;

    setIsUploading(true);
    try {
      const fileRef = ref(storage, `rooms/${roomId}/macros_edit_${Date.now()}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      
      const currentMacros = room.sceneMacros || [];
      const updatedMacros = currentMacros.map(m => m.id === editingMacroId ? { ...m, url } : m);
      await updateDoc(doc(db, "rooms", roomId), { sceneMacros: updatedMacros });
    } catch (error) {
      alert("이미지 변경에 실패했습니다.");
    } finally {
      setIsUploading(false);
      setEditingMacroId(null);
      if (editFileInputRef.current) editFileInputRef.current.value = "";
    }
  };

  // 5. 장면 삭제
  const handleDeleteScene = async (macroId: string) => {
    if (!confirm("이 장면을 삭제하시겠습니까?")) return;
    const currentMacros = room.sceneMacros || [];
    const updatedMacros = currentMacros.filter(m => m.id !== macroId);
    await updateDoc(doc(db, "rooms", roomId), { sceneMacros: updatedMacros });
  };

  const displayMacros = room.sceneMacros || [];

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col p-4 overflow-y-auto text-zinc-100 border-l border-amber-900/30">
      <h2 className="text-xl font-bold mb-6 text-amber-500 flex items-center gap-2">
        <span>👑</span> GM 컨트롤 패널
      </h2>

      {/* 1. 퀵 매크로 (장면 전환) */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3 border-b border-zinc-800 pb-2">🎬 빠른 장면 전환</h3>
        
        {displayMacros.length === 0 && (
          <div className="text-center py-6 text-xs text-zinc-600 border border-dashed border-zinc-800 rounded-lg mb-3">
            등록된 장면이 없습니다.<br/>아래 버튼을 눌러 이미지를 직접 등록해 보세요.
          </div>
        )}

        <div className="flex flex-col gap-2">
          {displayMacros.map((macro) => (
            <div key={macro.id} className="flex flex-col bg-zinc-900 rounded-lg border border-zinc-700 overflow-hidden group">
              
              <div className="flex items-center justify-between p-2">
                <span className="text-xs font-bold text-zinc-300 truncate pl-1">{macro.name}</span>
                
                {/* 우측 아이콘 버튼들 (이름수정/이미지변경/삭제) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEditSceneName(macro.id, macro.name)} className="px-1.5 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-[10px]">이름변경</button>
                  <button 
                    onClick={() => {
                      setEditingMacroId(macro.id);
                      editFileInputRef.current?.click();
                    }} 
                    className="px-1.5 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-[10px]"
                  >
                    이미지변경
                  </button>
                  <button onClick={() => handleDeleteScene(macro.id)} className="px-1.5 py-0.5 bg-red-900/60 hover:bg-red-700 text-white rounded text-[10px]">삭제</button>
                </div>
              </div>

              {/* 이미지 썸네일 겸 채팅창 전송 버튼 */}
              <button 
                onClick={() => handleSceneMacro(macro.name, macro.url)} 
                className="relative w-full h-16 bg-zinc-800 border-t border-zinc-700 hover:brightness-110 transition-all cursor-pointer"
              >
                <img src={macro.url} alt={macro.name} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">전송하기 🚀</span>
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* 숨겨진 파일 인풋 영역 */}
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAddScene} className="hidden" />
        <input type="file" accept="image/*" ref={editFileInputRef} onChange={handleEditSceneImage} className="hidden" />
        
        {/* 새 장면 등록 버튼 */}
        <button 
          onClick={() => fileInputRef.current?.click()} 
          disabled={isUploading}
          className="w-full mt-3 bg-zinc-800 hover:bg-zinc-700 text-amber-200 text-xs font-bold py-2.5 rounded-lg border border-dashed border-amber-700/50 transition-colors disabled:opacity-50"
        >
          {isUploading ? "업로드 중..." : "+ 새 장면 직접 업로드"}
        </button>
      </div>
      
      <div className="mt-4 p-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 text-center">
        <span className="text-xs text-zinc-500">추가 GM 도구(맵 변경 등)가<br/>여기에 업데이트 될 예정입니다.</span>
      </div>

    </div>
  );
}