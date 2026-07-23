"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/types/chat";
import { formatMessageTime } from "@/utils/formatDate";

interface MessageItemProps {
  message: ChatMessage;
  isGrouped: boolean;
  isMine?: boolean;
  isGMViewer?: boolean;
  onUpdate?: (id: string, newContent: string) => void;
  onDelete?: (id: string) => void;
}

export function MessageItem({ message, isGrouped, isMine = false, isGMViewer = false, onUpdate, onDelete }: MessageItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isMine && !isGMViewer) return;
    e.preventDefault();
    setShowMenu(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMine && !isGMViewer) return;
    timerRef.current = setTimeout(() => {
      setShowMenu(true);
    }, 500);
  };

  const handleTouchEndOrMove = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleSaveEdit = () => {
    if (onUpdate && editContent.trim() !== "") {
      onUpdate(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete && confirm("이 메시지를 삭제하시겠습니까?")) {
      onDelete(message.id);
    }
    setShowMenu(false);
  };

  // 말풍선 옆에 붙는 드롭다운 메뉴 (수정/삭제)
  const renderMenu = () => {
    if (!showMenu) return null;
    return (
      <>
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
          onContextMenu={(e) => { e.preventDefault(); setShowMenu(false); }}
        />
        <div
          className={`absolute z-50 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl flex flex-col overflow-hidden w-24 ${
            isMine ? "right-0" : "left-0"
          }`}
        >
          {(isGMViewer || message.type === "chat" || message.type === "gm") && (
            <button
              onClick={() => { setIsEditing(true); setShowMenu(false); }}
              className="px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-700 text-left transition-colors border-b border-zinc-700/50 font-medium"
            >
              ✏️ 수정
            </button>
          )}
          <button
            onClick={handleDelete}
            className="px-3 py-2 text-xs text-red-400 hover:bg-zinc-700 text-left transition-colors font-medium"
          >
            🗑️ 삭제
          </button>
        </div>
      </>
    );
  };

  // ==========================================
  // 1. 시스템 메시지 렌더링 
  // ==========================================
  if (message.type === "system") {
    
    // 🔥 추가된 부분: 우리가 보낸 물결 텍스트를 감지하면 말풍선 없이 예쁜 아이콘으로 교체!
    if (message.content === "〰️〰️〰️") {
      return (
        <div className="relative w-full flex flex-col items-center">
          <div
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEndOrMove}
            onTouchMove={handleTouchEndOrMove}
            className={`flex justify-center py-6 my-2 w-full ${isGMViewer ? "cursor-pointer" : ""}`}
          >
            {/* 배경 없는 예쁜 물결 곡선 SVG 디자인 */}
            <svg className="text-zinc-600/70" width="80" height="20" viewBox="0 0 80 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 5 10 Q 10 2 15 10 T 25 10 T 35 10 T 45 10 T 55 10 T 65 10 T 75 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          {renderMenu()}
        </div>
      );
    }

    const hasImage = /\[img\]\((.*?)\)/.test(message.content);

    if (hasImage) {
      const parts = message.content.split(/(\[img\]\(.*?\))/g);
      return (
        <div className="relative w-full flex flex-col items-center">
          <div
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEndOrMove}
            onTouchMove={handleTouchEndOrMove}
            className={`flex flex-col items-center py-6 my-6 w-full gap-4 ${isGMViewer ? "cursor-pointer" : ""}`}
          >
            {parts.map((part, idx) => {
              const imgMatch = part.match(/\[img\]\((.*?)\)/);
              if (imgMatch) {
                return <img key={idx} src={imgMatch[1]} alt="시스템 장면" className="max-w-[85%] rounded-xl shadow-2xl border-2 border-zinc-700 object-contain pointer-events-none select-none" />;
              }
              if (part.trim()) {
                return <span key={idx} className="text-sm font-bold text-amber-400 bg-zinc-900/90 px-6 py-2.5 rounded-full shadow-md border border-amber-900/50 tracking-wide pointer-events-none">{part.trim()}</span>;
              }
              return null;
            })}
          </div>
          {renderMenu()}
        </div>
      );
    }

    return (
      <div className="relative w-full flex flex-col items-center">
        <div
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEndOrMove}
          onTouchMove={handleTouchEndOrMove}
          className={`flex justify-center py-4 my-4 ${isGMViewer ? "cursor-pointer" : ""}`}
        >
          <span className="text-sm text-zinc-400 bg-zinc-800/80 px-6 py-2.5 rounded-full shadow-sm border border-zinc-700/50 tracking-wide pointer-events-none">{message.content}</span>
        </div>
        {renderMenu()}
      </div>
    );
  }

  const isGM = message.type === "gm";

  // ==========================================
  // 2. 일반 / GM / 다이스 메시지 - 말풍선 렌더링
  // ==========================================
  const bubbleColor = isMine
    ? "bg-indigo-600 text-white rounded-br-md"
    : isGM
    ? "bg-amber-950/50 border border-amber-700/40 text-amber-50 rounded-bl-md"
    : "bg-zinc-800 text-zinc-100 rounded-bl-md";

  const renderMessageContent = () => {
    if (isEditing) {
      return (
        <div className="w-64 flex flex-col gap-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full bg-zinc-950/80 text-white p-2.5 border border-zinc-600 rounded-lg outline-none resize-none min-h-[80px] text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setIsEditing(false); setEditContent(message.content); }} className="px-3 py-1 rounded bg-zinc-700 text-xs hover:bg-zinc-600 text-white transition-colors">취소</button>
            <button onClick={handleSaveEdit} className="px-3 py-1 rounded bg-indigo-500 text-white text-xs hover:bg-indigo-400 transition-colors">저장</button>
          </div>
        </div>
      );
    }

    const parseContentWithImages = (text: string) => {
      const parts = text.split(/(\[img\]\(.*?\))/g);
      return (
        <>
          {parts.map((part, idx) => {
            const imgMatch = part.match(/\[img\]\((.*?)\)/);
            if (imgMatch) return <img key={idx} src={imgMatch[1]} alt="첨부 이미지" className="max-w-full h-auto rounded-lg my-2 pointer-events-none" />;
            return <span key={idx} className="pointer-events-none">{part}</span>;
          })}
        </>
      );
    };

    if (message.type === "dice" && message.diceResult) {
      return (
        <div className="flex flex-col items-start text-left pointer-events-none">
          <span className="block text-sm mb-2 leading-relaxed">
            {parseContentWithImages(message.content)}
          </span>
          <div className="px-2.5 py-1.5 rounded-md bg-black/20 border border-white/10 w-fit">
            <span className="text-[10px] font-semibold tracking-wide opacity-70 block mb-1">ROLL: {message.diceResult.formula}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs opacity-70">[{message.diceResult.rolls.join(", ")}]</span>
              <span className="text-xs opacity-70">=</span>
              <span className="text-lg font-bold">{message.diceResult.total}</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-sm whitespace-pre-wrap break-words leading-relaxed text-left pointer-events-none">
        {parseContentWithImages(message.content)}
      </div>
    );
  };

  const timeString = formatMessageTime(message.createdAt);

  return (
    <div className={`flex w-full px-3 ${isMine ? "justify-end" : "justify-start"} ${isGrouped ? "mt-0.5" : "mt-3"}`}>
      <div className={`flex max-w-[75%] items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>

        {/* 프로필 사진 (32~36px, 그룹핑되면 자리만 남기고 숨김) */}
        <div className="w-9 shrink-0 self-end">
          {!isGrouped && (
            message.authorPhotoURL ? (
              <img src={message.authorPhotoURL} alt={message.authorName} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${isGM ? "bg-amber-950 text-amber-500" : "bg-zinc-700 text-zinc-300"}`}>
                {message.authorName.slice(0, 1)}
              </div>
            )
          )}
        </div>

        <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
          {!isGrouped && (
            <div className={`flex items-baseline gap-1.5 mb-1 px-1 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
              <span className={`text-xs font-semibold ${isGM ? "text-amber-400" : "text-zinc-400"}`}>{message.authorName}</span>
              {isGM && <span className="text-[9px] font-bold text-amber-500/80 border border-amber-500/40 px-1 rounded bg-amber-500/10">GM</span>}
              <span className="text-[10px] text-zinc-500">{timeString}</span>
            </div>
          )}

          {/* 말풍선 + 드롭다운 메뉴 묶음 */}
          <div className="relative inline-block">
            <div
              onContextMenu={handleContextMenu}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEndOrMove}
              onTouchMove={handleTouchEndOrMove}
              className={`px-3.5 py-2 rounded-2xl shadow-sm cursor-pointer ${bubbleColor}`}
            >
              {renderMessageContent()}
            </div>
            {renderMenu()}
          </div>
        </div>
      </div>
    </div>
  );
}