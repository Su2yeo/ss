"use client";

import { useRef, useState } from "react";
import { ChatWindow } from "./ChatWindow";
import { MenuSidebar } from "@/components/Sidebar/MenuSidebar";
import { GMSidebar } from "@/components/Sidebar/GMSidebar";
import { HandoutBoard } from "@/components/Sidebar/HandoutBoard";
import type { Character } from "@/types/character";

const PEEK_HEIGHT = 64;
const FULL_RATIO = 0.85;

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
  
  // 🔥 탭 상태를 데스크탑과 동일하게 확장 (character, handout 추가)
  const [activeTab, setActiveTab] = useState<"chat" | "character" | "handout" | "gm">("chat");

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

    const threshold = 40; 
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
      {/* 1. 드래그 손잡이 */}
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

      {/* 2. 바텀 시트 인덱스 탭 (모바일 화면을 위해 가로 스크롤 허용) */}
      {open && (
        <div className="flex px-2 bg-zinc-900 border-b border-zinc-800 shrink-0 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-2.5 text-xs font-bold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "chat" ? "text-indigo-400 border-indigo-500" : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            💬 채팅
          </button>
          <button
            onClick={() => setActiveTab("character")}
            className={`px-4 py-2.5 text-xs font-bold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "character" ? "text-indigo-400 border-indigo-500" : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            👤 캐릭터 관리
          </button>
          <button
            onClick={() => setActiveTab("handout")}
            className={`px-4 py-2.5 text-xs font-bold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "handout" ? "text-indigo-400 border-indigo-500" : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            📜 핸드아웃
          </button>
          {isGM && (
            <button
              onClick={() => setActiveTab("gm")}
              className={`px-4 py-2.5 text-xs font-bold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "gm" ? "text-amber-500 border-amber-500" : "text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              👑 GM 패널
            </button>
          )}
        </div>
      )}

      {/* 3. 콘텐츠 영역 */}
      <div className={`flex-1 min-h-0 flex flex-col ${open ? "" : "pointer-events-none opacity-0 hidden"}`}>
        
        {/* 채팅 화면 */}
        <div className={`flex-1 flex-col overflow-hidden ${activeTab === "chat" ? "flex" : "hidden"}`}>
          <ChatWindow roomId={roomId} currentUser={currentUser} isGM={isGM} activeCharacter={activeCharacter ?? null} />
        </div>

        {/* 캐릭터 관리 화면 */}
        <div className={`flex-1 flex-col overflow-hidden ${activeTab === "character" ? "flex" : "hidden"}`}>
          <MenuSidebar roomId={roomId} currentUser={currentUser} room={room} activeCharacter={activeCharacter ?? null} setActiveCharacter={setActiveCharacter} />
        </div>

        {/* 🔥 핸드아웃 게시판 연결 완료 */}
        <div className={`flex-1 flex-col overflow-hidden ${activeTab === "handout" ? "flex" : "hidden"}`}>
          <HandoutBoard roomId={roomId} room={room} isGM={isGM} />
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