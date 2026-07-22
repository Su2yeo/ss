"use client";

import { useEffect, useRef, useState } from "react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { MessageItem } from "@/components/Chat/MessageItem";
import { DateDivider } from "@/components/Chat/DateDivider";
import { ChatInput } from "@/components/Chat/ChatInput";
import { formatDateDivider, isSameDay } from "@/utils/formatDate";
import type { MessageType } from "@/types/chat";
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

  useEffect(() => {
    activeCharRef.current = activeCharacter;
  }, [activeCharacter]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < SCROLL_BOTTOM_THRESHOLD;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = async (
    content: string, 
    type: Exclude<MessageType, "system">,
    diceResult?: { formula: string; rolls: number[]; total: number }
  ) => {
    const currentChar = activeCharRef.current;
    const finalAuthorName = currentChar ? currentChar.name : currentUser.displayName;
    
    const payload: any = {
      type,
      authorId: currentUser.uid, 
      authorName: finalAuthorName,
      content,
    };

    const finalAuthorPhoto = currentChar ? currentChar.avatarUrl : currentUser.photoURL;
    if (finalAuthorPhoto) payload.authorPhotoURL = finalAuthorPhoto;
    if (diceResult) payload.diceResult = diceResult;

    await sendMessage(payload);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-2xl overflow-hidden shadow-lg border border-zinc-800">
      
      {/* ❌ 여기에 있던 상단 화자 표시 삭제됨 */}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-zinc-950/50"
      >
        {loading && <p className="text-center text-sm text-zinc-500 py-6">채팅을 불러오는 중...</p>}
        {error && <p className="text-center text-sm text-red-400 py-6">{error}</p>}
        {!loading && !error && messages.length === 0 && (
          <p className="text-center text-sm text-zinc-600 py-10 font-medium">
            아직 메시지가 없습니다. 첫 메시지를 남겨보세요.
          </p>
        )}

        {messages.map((msg, i) => {
          const prev = messages[i - 1];
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

      {/* 🔥 입력창 바로 위로 이동한 '현재 화자' 표시 영역 */}
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

      <ChatInput onSend={handleSend} sending={sending} isGM={isGM} />
    </div>
  );
}