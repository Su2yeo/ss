"use client";

import { useRef, useState } from "react";
import { ChatWindow } from "./ChatWindow";
import { MenuSidebar } from "@/components/Sidebar/MenuSidebar";
import { GMSidebar } from "@/components/Sidebar/GMSidebar";
import type { Character } from "@/types/character";

const PEEK_HEIGHT = 64;
const FULL_RATIO = 0.85;

// 🔥 RoomPage에서 넘겨주는 추가 Props(room, activeCharacter 등)를 정의합니다.
interface ChatSheetProps {
  roomId: string;
  currentUser: { uid: string; displayName: string; photoURL?: string | null };
  isGM: boolean;
  room: any; 
  activeCharacter?: Character | null;
  setActiveCharacter: (char: Character | null) => void;
}

export function ChatSheet({ roomId, currentUser, isGM, room, activeCharacter, setActiveCharacter }: ChatSheetProps) {
  const [open, setOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);
  
  // 🔥 탭 상태 관리
  const [activeTab, setActiveTab] = useState<"chat" | "menu" | "gm">("chat");

  const fullHeight = typeof window !== "undefined" ? window.innerHeight * FULL_RATIO : 600;

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    dragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || startY.current == null) return;
    setDragOffset(e.touches[0].clientY - startY.current);
  };

  const handleTouchEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;

    const threshold = 40; // 이 정도 이상 밀어야 상태가 바뀜
    if (!open && dragOffset < -threshold) setOpen(true);
    if (open && dragOffset > threshold) setOpen(false);

    setDragOffset(0);
    startY.current = null;
  };

  const baseHeight = open ? fullHeight : PEEK_HEIGHT;
  const liveHeight = dragging.current
    ? Math.min(fullHeight, Math.max(PEEK_HEIGHT, baseHeight - dragOffset))
    : baseHeight;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-zinc-950 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 flex flex-col"
      style={{ height: liveHeight, transition: dragging.current ? "none" : "height 200ms ease-out" }}
    >
      {/* 1. 원래 있던 드래그 손잡이 (여기를 클릭하거나 드래그해서 엽니다) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col items-center justify-center py-2.5 shrink-0 cursor-grab active:cursor-grabbing bg-zinc-900 rounded-t-2xl"
      >
        <div className="w-10 h-1.5 rounded-full bg-zinc-700" />
        {!open && <span className="text-xs text-zinc-500 mt-1.5 font-medium">위로 밀어서 메뉴 열기</span>}
      </div>

      {/* 2. 바텀 시트가 열렸을 때만 보이는 인덱스 탭 */}
      {open && (
        <div className="flex px-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 py-2.5 text-xs font-bold transition-colors border-b-2 ${
              activeTab === "chat" ? "text-indigo-400 border-indigo-500" : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            💬 채팅
          </button>
          <button
            onClick={() => setActiveTab("menu")}
            className={`flex-1 py-2.5 text-xs font-bold transition-colors border-b-2 ${
              activeTab === "menu" ? "text-indigo-400 border-indigo-500" : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            🎭 캐릭터/메뉴
          </button>
          {isGM && (
            <button
              onClick={() => setActiveTab("gm")}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors border-b-2 ${
                activeTab === "gm" ? "text-amber-500 border-amber-500" : "text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              👑 GM 패널
            </button>
          )}
        </div>
      )}

      {/* 3. 콘텐츠 영역 (선택된 탭에 따라 숨김/표시 처리) */}
      <div className={`flex-1 min-h-0 flex flex-col ${open ? "" : "pointer-events-none opacity-0 hidden"}`}>
        
        {/* 채팅 화면 */}
        <div className={`flex-1 flex-col overflow-hidden ${activeTab === "chat" ? "flex" : "hidden"}`}>
          <ChatWindow roomId={roomId} currentUser={currentUser} isGM={isGM} activeCharacter={activeCharacter} />
        </div>

        {/* 메뉴 화면 */}
        <div className={`flex-1 flex-col overflow-hidden ${activeTab === "menu" ? "flex" : "hidden"}`}>
          <MenuSidebar roomId={roomId} currentUser={currentUser} room={room} activeCharacter={activeCharacter} setActiveCharacter={setActiveCharacter} />
        </div>

        {/* GM 패널 */}
        {isGM && (
          <div className={`flex-1 flex-col overflow-hidden ${activeTab === "gm" ? "flex" : "hidden"}`}>
            <GMSidebar roomId={roomId} room={room} />
          </div>
        )}
      </div>

    </div>
  );
}