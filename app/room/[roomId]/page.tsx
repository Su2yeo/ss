"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useRoomInfo, joinRoom } from "@/hooks/useRoom";
import { ChatWindow } from "@/components/Chat/ChatWindow";
import { ChatSheet } from "@/components/Chat/ChatSheet";
import MapBoard from "@/components/Map/MapBoard";
import { MenuSidebar } from "@/components/Sidebar/MenuSidebar";
import { GMSidebar } from "@/components/Sidebar/GMSidebar"; 
import type { Character } from "@/types/character";

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const { roomId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const { room, loading: roomLoading, error: roomError } = useRoomInfo(roomId);
  const router = useRouter();
  const [joinAttempted, setJoinAttempted] = useState(false);

  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  
  // 🔥 탭 상태: chat, menu, gm 3가지
  const [activeTab, setActiveTab] = useState<"chat" | "menu" | "gm">("chat");
  const [rightPanelWidth, setRightPanelWidth] = useState(400);

  const isWide = rightPanelWidth >= 700;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX; 
      const newWidth = Math.max(320, Math.min(1000, startWidth + deltaX));
      setRightPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (authLoading || roomLoading || !user || !room || joinAttempted) return;
    const isMember = !!room.members[user.uid];
    if (!isMember) {
      setJoinAttempted(true);
      joinRoom(roomId, { uid: user.uid, displayName: user.displayName ?? "이름없음", photoURL: user.photoURL })
        .catch((err) => console.error("[RoomPage] 자동 참가 실패:", err));
    }
  }, [authLoading, roomLoading, user, room, roomId, joinAttempted]);

  if (authLoading || roomLoading) return <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">불러오는 중...</div>;
  if (!user) return null;
  if (roomError || !room) return <div className="flex h-screen items-center justify-center bg-zinc-950 text-red-400">{roomError}</div>;

  const currentUser = { uid: user.uid, displayName: user.displayName ?? "이름없음", photoURL: user.photoURL };
  
  // 🔥 내가 GM인지 확인하는 변수
  const isGM = room.gmId === user.uid;

 return (
    <div className="h-screen bg-zinc-950 flex overflow-hidden">
      {/* 데스크탑 뷰 */}
      <div className="hidden md:flex h-full w-full">
        
        <div className="flex-1 h-full min-w-0">
          <MapBoard roomId={roomId} currentUser={currentUser} isGM={isGM} />
        </div>

        <div 
          onMouseDown={handleMouseDown}
          className="w-1.5 h-full bg-zinc-800 hover:bg-indigo-500 cursor-col-resize z-50 transition-colors flex items-center justify-center group"
        >
           <div className="w-0.5 h-8 bg-zinc-600 group-hover:bg-white rounded-full"></div>
        </div>

        <div style={{ width: rightPanelWidth }} className="shrink-0 h-full bg-zinc-900 flex flex-col z-10 border-l border-zinc-800">
          
          {/* 하단 탭 영역 (좁은 화면일 때) */}
          {!isWide && (
            <div className="flex px-3 pt-3 bg-zinc-950 border-b border-zinc-700 gap-1 shrink-0 overflow-x-auto">
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg border-t border-x transition-colors whitespace-nowrap ${
                  activeTab === "chat" ? "bg-zinc-900 border-zinc-700 text-indigo-400 translate-y-[1px] border-b-zinc-900" : "bg-zinc-950 border-transparent text-zinc-500 hover:bg-zinc-900"
                }`}
              >
                💬 채팅
              </button>
              <button
                onClick={() => setActiveTab("menu")}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg border-t border-x transition-colors whitespace-nowrap ${
                  activeTab === "menu" ? "bg-zinc-900 border-zinc-700 text-indigo-400 translate-y-[1px] border-b-zinc-900" : "bg-zinc-950 border-transparent text-zinc-500 hover:bg-zinc-900"
                }`}
              >
                🎭 게임 메뉴
              </button>
              
              {/* 🔥 GM일 때만 3번째 탭 표시 */}
              {isGM && (
                <button
                  onClick={() => setActiveTab("gm")}
                  className={`px-4 py-2 text-sm font-bold rounded-t-lg border-t border-x transition-colors whitespace-nowrap ${
                    activeTab === "gm" ? "bg-zinc-900 border-amber-900/50 text-amber-500 translate-y-[1px] border-b-zinc-900" : "bg-zinc-950 border-transparent text-zinc-600 hover:bg-zinc-900 hover:text-amber-600/50"
                  }`}
                >
                  👑 GM 패널
                </button>
              )}
            </div>
          )}

          {/* 콘텐츠 영역 */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* 1. 채팅창 */}
            <div className={`flex-col h-full ${isWide || activeTab === "chat" ? "flex flex-1" : "hidden"}`}>
              <ChatWindow roomId={roomId} currentUser={currentUser} isGM={isGM} activeCharacter={activeCharacter} />
            </div>

            {isWide && <div className="w-[1px] h-full bg-zinc-800"></div>}

            {/* 2. 사이드바 (메뉴 or GM) */}
            <div className={`h-full ${isWide || activeTab !== "chat" ? "flex flex-col" : "hidden"} ${isWide ? "w-[320px] shrink-0" : "w-full"}`}>
              
              {/* 넓은 화면(isWide)일 때는 위쪽에 작은 탭 버튼 띄우기 */}
              {isWide && (
                <div className="flex bg-zinc-950 border-b border-zinc-800 p-1 gap-1">
                  <button 
                    onClick={() => setActiveTab("menu")} 
                    className={`flex-1 py-1 text-xs font-bold rounded transition-colors ${activeTab !== "gm" ? "bg-zinc-800 text-indigo-300" : "text-zinc-500 hover:bg-zinc-800"}`}
                  >
                    🎭 게임 메뉴
                  </button>
                  
                  {isGM && (
                    <button 
                      onClick={() => setActiveTab("gm")} 
                      className={`flex-1 py-1 text-xs font-bold rounded transition-colors ${activeTab === "gm" ? "bg-amber-900/50 text-amber-500" : "text-zinc-500 hover:bg-zinc-800"}`}
                    >
                      👑 GM 패널
                    </button>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-hidden">
                {/* 탭 상태에 따라 렌더링 변경 */}
                {activeTab === "gm" && isGM ? (
                  <GMSidebar roomId={roomId} room={room} />
                ) : (
                  <MenuSidebar 
                    roomId={roomId} 
                    currentUser={currentUser} 
                    room={room} 
                    activeCharacter={activeCharacter} 
                    setActiveCharacter={setActiveCharacter} 
                  />
                )}
              </div>

            </div>

          </div>
        </div>

      </div>

      <div className="md:hidden h-full w-full relative">
        <div className="absolute inset-0">
          <MapBoard roomId={roomId} currentUser={currentUser} isGM={isGM} />
        </div>
        {/* 🔥 ChatSheet에 room, activeCharacter 데이터도 넘겨주도록 수정! */}
        <ChatSheet 
          roomId={roomId} 
          currentUser={currentUser} 
          isGM={isGM} 
          room={room} 
          activeCharacter={activeCharacter} 
          setActiveCharacter={setActiveCharacter} 
        />
      </div>
    </div>
  );
}