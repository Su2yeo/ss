"use client";

import { useState } from "react";
import { useCharacters } from "@/hooks/useCharacters";
import type { RoomInfo } from "@/types/room";
import type { Character } from "@/types/character";

interface CharacterSidebarProps {
  roomId: string;
  currentUser: { uid: string };
  room: RoomInfo; // 방 정보 (참가자 목록을 알기 위해 필요)
  activeCharacter: Character | null; // 현재 선택된 캐릭터
  setActiveCharacter: (char: Character | null) => void;
}

export function CharacterSidebar({ 
  roomId, currentUser, room, activeCharacter, setActiveCharacter 
}: CharacterSidebarProps) {
  const { characters, loadingChars, createCharacter, assignCharacter } = useCharacters(roomId);
  
  // GM용 새 캐릭터 생성 상태
  const [newCharName, setNewCharName] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState(currentUser.uid);
  const [isCreating, setIsCreating] = useState(false);

  const isGM = room.gmId === currentUser.uid;
  const myCharacters = characters.filter((c) => c.ownerId === currentUser.uid);

  // 캐릭터 생성 실행
  const handleCreate = async () => {
    if (!newCharName.trim()) return;
    setIsCreating(true);
    try {
      await createCharacter(newCharName, selectedOwnerId);
      setNewCharName("");
    } catch (error) {
      alert("캐릭터 생성 실패");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-80 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col p-4 overflow-y-auto text-zinc-100">
      <h2 className="text-xl font-bold mb-6 text-indigo-400">캐릭터 시트</h2>

      {/* 1. 내 캐릭터 목록 (누구나 보임) */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">내 캐릭터</h3>
        {loadingChars ? (
          <p className="text-xs text-zinc-500">불러오는 중...</p>
        ) : myCharacters.length === 0 ? (
          <p className="text-xs text-zinc-500">할당된 캐릭터가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {/* 본인(플레이어 계정)으로 채팅하기 버튼 */}
            <button
              onClick={() => setActiveCharacter(null)}
              className={`p-3 rounded-xl text-left text-sm font-medium transition-all ${
                activeCharacter === null 
                  ? "bg-indigo-600 text-white border border-indigo-500" 
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
              }`}
            >
              👤 기본 플레이어 (본인)
            </button>
            
            {/* 내 캐릭터들 */}
            {myCharacters.map((char) => (
              <button
                key={char.id}
                onClick={() => setActiveCharacter(char)}
                className={`p-3 rounded-xl text-left text-sm font-medium transition-all ${
                  activeCharacter?.id === char.id 
                    ? "bg-indigo-600 text-white border border-indigo-500 shadow-lg" 
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
                }`}
              >
                🎭 {char.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. GM 전용: 캐릭터 생성 (GM만 보임) */}
      {isGM && (
        <div className="mt-auto pt-6 border-t border-zinc-800">
          <h3 className="text-sm font-semibold text-amber-500 mb-3">🛠️ [GM] 캐릭터 생성</h3>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={newCharName}
              onChange={(e) => setNewCharName(e.target.value)}
              placeholder="캐릭터 이름"
              className="w-full bg-zinc-800 text-sm px-3 py-2 rounded-lg border border-zinc-700 focus:outline-none focus:border-amber-500"
            />
            <select
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
              className="w-full bg-zinc-800 text-sm px-3 py-2 rounded-lg border border-zinc-700 focus:outline-none"
            >
              {Object.entries(room.members).map(([uid, member]) => (
                <option key={uid} value={uid}>
                  {member.displayName} ({member.role})
                </option>
              ))}
            </select>
            <button
              onClick={handleCreate}
              disabled={isCreating || !newCharName.trim()}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {isCreating ? "생성 중..." : "캐릭터 만들어주기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}