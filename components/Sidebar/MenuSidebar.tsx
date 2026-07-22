"use client";

import { useState } from "react";
import { useCharacters } from "@/hooks/useCharacters";
import { CharacterEditModal } from "@/components/Character/CharacterEditModal";
import type { RoomInfo } from "@/types/room";
import type { Character, SheetType } from "@/types/character";

interface MenuSidebarProps {
  roomId: string;
  currentUser: { uid: string };
  room: RoomInfo; 
  activeCharacter: Character | null;
  setActiveCharacter: (char: Character | null) => void;
}

export function MenuSidebar({
  roomId, currentUser, room, activeCharacter, setActiveCharacter
}: MenuSidebarProps) {
  const { characters, loadingChars, createCharacter, updateCharacter } = useCharacters(roomId);
  
  const [newCharName, setNewCharName] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState(currentUser.uid);
  const [selectedSheetType, setSelectedSheetType] = useState<SheetType>("basic");
  const [isCreating, setIsCreating] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  const isGM = room.gmId === currentUser.uid;
  
  // 🔥 내 캐릭터와 다른 사람 캐릭터 분리
  const myCharacters = characters.filter((c) => c.ownerId === currentUser.uid);
  const otherCharacters = characters.filter((c) => c.ownerId !== currentUser.uid);

  const handleCreate = async () => {
    if (!newCharName.trim()) return;
    setIsCreating(true);
    try {
      await createCharacter(newCharName, selectedOwnerId, selectedSheetType);
      setNewCharName("");
    } catch (error) {
      alert("캐릭터 생성 실패");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <div className="w-full h-full bg-zinc-900 flex flex-col p-4 overflow-y-auto text-zinc-100">
        <h2 className="text-xl font-bold mb-6 text-indigo-400">캐릭터 관리</h2>

        {loadingChars ? (
          <p className="text-xs text-zinc-500">불러오는 중...</p>
        ) : (
          <>
            {/* 1. 내 캐릭터 목록 */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">내 캐릭터 시트</h3>
              <div className="flex flex-col gap-2">
                <button onClick={() => setActiveCharacter(null)} className={`p-3 rounded-xl text-left text-sm font-medium transition-all flex items-center gap-3 ${activeCharacter === null ? "bg-indigo-600 text-white border border-indigo-500" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"}`}>
                  <span className="text-xl">👤</span>본인 계정
                </button>
                
                {myCharacters.map((char) => (
                  <div key={char.id} onClick={() => setActiveCharacter(char)} className={`flex items-center justify-between p-2 pl-3 rounded-xl cursor-pointer transition-all border ${activeCharacter?.id === char.id ? "bg-indigo-600 border-indigo-500 shadow-lg text-white" : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"}`}>
                    <div className="flex items-center gap-3">
                      {char.avatarUrl ? <img src={char.avatarUrl} alt={char.name} className="w-8 h-8 rounded-full object-cover border border-zinc-500/30" /> : <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs">🎭</div>}
                      <div className="flex flex-col">
                         <span className="text-sm font-medium">{char.name}</span>
                         <span className="text-[10px] text-zinc-500">{char.sheetType === "shinobigami" ? "시노비가미" : "기본"}</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setEditingCharacter(char); }} className="p-2 rounded-lg hover:bg-zinc-600/50 text-zinc-400 hover:text-white transition-colors">⚙️</button>
                  </div>
                ))}
              </div>
            </div>

            {/* 🔥 2. GM 전용: 다른 플레이어 캐릭터 목록 */}
            {isGM && otherCharacters.length > 0 && (
              <div className="mb-8 pt-6 border-t border-zinc-800/50">
                <h3 className="text-sm font-semibold text-amber-500 mb-3">👑 모든 캐릭터 (GM 열람용)</h3>
                <div className="flex flex-col gap-2">
                  {otherCharacters.map((char) => (
                    <div key={char.id} onClick={() => setActiveCharacter(char)} className={`flex items-center justify-between p-2 pl-3 rounded-xl cursor-pointer transition-all border ${activeCharacter?.id === char.id ? "bg-amber-600/20 border-amber-500/50 shadow-lg text-white" : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:bg-zinc-700/50"}`}>
                      <div className="flex items-center gap-3">
                        {char.avatarUrl ? <img src={char.avatarUrl} alt={char.name} className="w-8 h-8 rounded-full object-cover opacity-70" /> : <div className="w-8 h-8 rounded-full bg-zinc-700/50 flex items-center justify-center text-xs">🎭</div>}
                        <div className="flex flex-col">
                           <span className="text-sm font-medium">{char.name}</span>
                           {/* 본체 플레이어 이름 표시 */}
                           <span className="text-[10px] text-zinc-500">PL: {room.members[char.ownerId]?.displayName || "알 수 없음"}</span>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setEditingCharacter(char); }} className="p-2 rounded-lg hover:bg-zinc-600/50 text-zinc-400 hover:text-white transition-colors">⚙️</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* 3. GM 전용: 캐릭터 배분 폼 */}
        {isGM && (
          <div className="mt-auto pt-6 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-amber-500 mb-3">🛠️ 시트 배분 (GM)</h3>
            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 flex flex-col gap-3">
              <input type="text" value={newCharName} onChange={(e) => setNewCharName(e.target.value)} placeholder="새 캐릭터 이름" className="w-full bg-zinc-900 text-sm px-3 py-2 rounded-lg border border-zinc-700 focus:outline-none focus:border-amber-500" />
              <select value={selectedSheetType} onChange={(e) => setSelectedSheetType(e.target.value as SheetType)} className="w-full bg-zinc-900 text-sm px-3 py-2 rounded-lg border border-zinc-700 focus:outline-none">
                <option value="basic">기본 프로필</option>
                <option value="shinobigami">시노비가미 프로필</option>
              </select>
              <select value={selectedOwnerId} onChange={(e) => setSelectedOwnerId(e.target.value)} className="w-full bg-zinc-900 text-sm px-3 py-2 rounded-lg border border-zinc-700 focus:outline-none">
                {Object.entries(room.members).map(([uid, member]) => (
                  <option key={uid} value={uid}>{member.displayName} ({member.role})</option>
                ))}
              </select>
              <button onClick={handleCreate} disabled={isCreating || !newCharName.trim()} className="w-full bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold py-2 rounded-lg disabled:opacity-50 transition-colors">
                {isCreating ? "생성 중..." : "캐릭터 배분하기"}
              </button>
            </div>
          </div>
        )}
      </div>

      {editingCharacter && (
        <CharacterEditModal roomId={roomId} character={editingCharacter} onClose={() => setEditingCharacter(null)} onUpdate={updateCharacter} />
      )}
    </>
  );
}