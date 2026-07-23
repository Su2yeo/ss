"use client";

import { useEffect, useRef, useState } from "react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { MessageItem } from "@/components/Chat/MessageItem";
import { DateDivider } from "@/components/Chat/DateDivider";
import { ChatInput } from "@/components/Chat/ChatInput";
import { formatDateDivider, isSameDay } from "@/utils/formatDate";
import type { MessageType, NewChatMessageInput } from "@/types/chat";
import type { Character } from "@/types/character";

interface ChatWindowProps {
  roomId: string;
  currentUser: { uid: string; displayName: string; photoURL?: string | null };
  isGM: boolean;
  activeCharacter?: Character | null;
}

const SCROLL_BOTTOM_THRESHOLD = 80;

export function ChatWindow({ roomId, currentUser, isGM, activeCharacter }: ChatWindowProps) {
  const { messages, loading, error, sendMessage, sending, updateMessage, deleteMessage } = useChatMessages(roomId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const activeCharRef = useRef(activeCharacter);

  // 🔥 본편/잡담 탭 상태 관리
  const [chatCategory, setChatCategory] = useState<"main" | "ooc">("main");

  // 🔥 현재 탭(category)에 맞는 메시지만 필터링 (기존 메시지는 기본적으로 main으로 취급)
  const filteredMessages = messages.filter(msg => (msg.category || "main") === chatCategory);

  useEffect(() => {
    activeCharRef.current = activeCharacter;
  }, [activeCharacter]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < SCROLL_BOTTOM_THRESHOLD;
  };

  // 🔥 탭을 전환하거나 새 메시지가 올 때 스크롤 맨 아래로 이동
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [filteredMessages, chatCategory]);

  const handleSend = async (
    content: string, 
    type: Exclude<MessageType, "system">,
    diceResult?: { formula: string; rolls: number[]; total: number }
  ) => {
    const currentChar = activeCharRef.current;
    const finalAuthorName = currentChar ? currentChar.name : currentUser.displayName;
    
    const payload: NewChatMessageInput = {
      type,
      authorId: currentUser.uid, 
      authorName: finalAuthorName,
      content,
      category: chatCategory, // 🔥 전송 시 현재 열려있는 탭 정보를 함께 저장
    };

    const finalAuthorPhoto = currentChar ? currentChar.avatarUrl : currentUser.photoURL;
    if (finalAuthorPhoto) payload.authorPhotoURL = finalAuthorPhoto;
    if (diceResult) payload.diceResult = diceResult;

    await sendMessage(payload);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-2xl overflow-hidden shadow-lg border border-zinc-800">
      
      {/* 🔥 상단 본편 / 잡담 탭 전환 버튼 */}
      <div className="flex bg-zinc-900 border-b border-zinc-800 shrink-0">
        <button
          onClick={() => setChatCategory("main")}
          className={`flex-1 py-3 text-xs font-bold transition-colors ${
            chatCategory === "main" ? "text-indigo-400 border-b-2 border-indigo-500 bg-zinc-800/50" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
          }`}
        >
          🎭 본편
        </button>
        <button
          onClick={() => setChatCategory("ooc")}
          className={`flex-1 py-3 text-xs font-bold transition-colors ${
            chatCategory === "ooc" ? "text-emerald-400 border-b-2 border-emerald-500 bg-zinc-800/50" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
          }`}
        >
          💬 잡담 (OOC)
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-zinc-950/50"
      >
        {loading && <p className="text-center text-sm text-zinc-500 py-6">채팅을 불러오는 중...</p>}
        {error && <p className="text-center text-sm text-red-400 py-6">{error}</p>}
        {!loading && !error && filteredMessages.length === 0 && (
          <p className="text-center text-sm text-zinc-600 py-10 font-medium">
            아직 {chatCategory === "main" ? "본편" : "잡담"} 메시지가 없습니다.
          </p>
        )}

        {filteredMessages.map((msg, i) => {
          const prev = filteredMessages[i - 1];
          const showDateDivider = !prev || !isSameDay(prev.createdAt, msg.createdAt);
          const isGrouped =
            !showDateDivider &&
            !!prev &&
            prev.type !== "system" &&
            msg.type !== "system" &&
            prev.authorId === msg.authorId &&
            prev.authorName === msg.authorName && 
            prev.type === msg.type;

          const isMine = msg.authorId === currentUser.uid;

          return (
            <div key={msg.id}>
              {showDateDivider && (
                <DateDivider label={formatDateDivider(msg.createdAt)} />
              )}
              <MessageItem 
                message={msg} 
                isGrouped={isGrouped} 
                isMine={isMine} 
                isGMViewer={isGM}
                onUpdate={updateMessage}
                onDelete={deleteMessage}
              />
            </div>
          );
        })}
      </div>

      <div className="w-full bg-zinc-900 border-t border-zinc-800 px-4 py-2 flex items-center gap-2 text-[11px] shrink-0 z-10 shadow-sm">
        <span className="text-zinc-400 font-medium">현재 화자:</span>
        {activeCharacter ? (
          <div className="flex items-center gap-1.5 bg-indigo-900/40 border border-indigo-700/50 px-2 py-0.5 rounded text-indigo-300 font-bold">
            {activeCharacter.avatarUrl && (
              <img src={activeCharacter.avatarUrl} alt="캐릭터" className="w-4 h-4 rounded-full object-cover" />
            )}
            <span>{activeCharacter.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded font-bold">
            {isGM ? (
              <span className="text-amber-500">👑 방장 (GM)</span>
            ) : (
              <span className="text-zinc-300">{currentUser.displayName} (본인)</span>
            )}
          </div>
        )}
      </div>

      <ChatInput onSend={handleSend} sending={sending} isGM={isGM} chatCategory={chatCategory} />
    </div>
  );
}