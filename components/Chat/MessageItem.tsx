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

  // 🖱️ 우클릭 이벤트 (마우스 좌표 계산 제거, 단순히 띄우기만 함)
  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isMine && !isGMViewer) return; 
    e.preventDefault();
    setShowMenu(true);
  };

  // 👆 꾹 누르기 이벤트
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

  // 🔥 드롭다운 메뉴 렌더러 (좌표 대신 Absolute를 사용하여 항상 메시지 근처에 뜨게 고정)
  const renderMenu = () => {
    if (!showMenu) return null;
    return (
      <>
        {/* 투명 배경 (클릭 시 메뉴 닫힘) */}
        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} onContextMenu={(e) => { e.preventDefault(); setShowMenu(false); }} />
        
        {/* 실제 메뉴 컨테이너 */}
        <div 
          className={`absolute z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl flex flex-col overflow-hidden w-28 ${
            message.type === 'system' ? 'top-full left-1/2 -translate-x-1/2' : (isMine ? 'top-full right-16' : 'top-full left-20')
          }`}
          style={{ marginTop: '-10px' }} // 메시지 창에 살짝 걸치게 조정
        >
          {(isGMViewer || message.type === "chat" || message.type === "gm") && (
            <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-700 text-left transition-colors border-b border-zinc-700/50 font-medium">✏️ 수정</button>
          )}
          <button onClick={handleDelete} className="px-4 py-3 text-sm text-red-400 hover:bg-zinc-700 text-left transition-colors font-medium">🗑️ 삭제</button>
        </div>
      </>
    );
  };

  // ==========================================
  // 1. 시스템 메시지 렌더링
  // ==========================================
  if (message.type === "system") {
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
  // 2. 일반 메시지 렌더링
  // ==========================================
  const renderMessageContent = () => {
    if (isEditing) {
      return (
        <div className="w-full flex flex-col gap-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full bg-zinc-950/80 text-white p-3 border border-zinc-600 rounded outline-none resize-none min-h-[100px] text-base"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setIsEditing(false); setEditContent(message.content); }} className="px-4 py-1.5 rounded bg-zinc-700 text-sm hover:bg-zinc-600 text-white transition-colors">취소</button>
            <button onClick={handleSaveEdit} className="px-4 py-1.5 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition-colors">저장</button>
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
            if (imgMatch) return <img key={idx} src={imgMatch[1]} alt="첨부 이미지" className="max-w-full h-auto rounded-lg mx-auto my-3 drop-shadow-md border border-zinc-700/50 pointer-events-none" />;
            return <span key={idx} className="pointer-events-none">{part}</span>;
          })}
        </>
      );
    };

    if (message.type === "dice" && message.diceResult) {
      return (
        <div className="flex flex-col items-center justify-center text-center w-full pointer-events-none">
          <span className={`block text-base mb-3 leading-relaxed ${isMine ? "text-indigo-50" : "text-zinc-100"}`}>
            {parseContentWithImages(message.content)}
          </span>
          <div className="p-3 bg-black/30 border border-white/10 w-fit min-w-[220px] mt-1">
            <span className="text-[11px] font-semibold tracking-wider opacity-80 block mb-1.5">ROLL: {message.diceResult.formula}</span>
            <div className="flex items-center justify-center gap-2.5">
              <span className="text-sm opacity-70">[{message.diceResult.rolls.join(", ")}]</span>
              <span className="text-sm opacity-80">=</span>
              <span className={`text-2xl font-bold ${isGM ? "text-amber-400" : "text-indigo-400"}`}>{message.diceResult.total}</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-base whitespace-pre-wrap break-words leading-[1.8] text-center w-full pointer-events-none">
        {parseContentWithImages(message.content)}
      </div>
    );
  };

  const timeString = formatMessageTime(message.createdAt);

  return (
    <div className="relative w-full">
      <div className={`flex w-full px-4 ${isMine ? "justify-end" : "justify-start"} mt-8 mb-4`}>
        <div className={`flex w-full max-w-[90%] items-stretch gap-6 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
          
          {!isGrouped ? (
            <div className="w-40 shrink-0 bg-transparent flex items-center justify-center overflow-visible">
              {message.authorPhotoURL ? (
                <img src={message.authorPhotoURL} alt={message.authorName} className="w-full h-full object-contain drop-shadow-md" />
              ) : (
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold border-2 ${isGM ? "bg-amber-950 border-amber-700/50 text-amber-500" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>
                  {message.authorName.slice(0, 1)}
                </div>
              )}
            </div>
          ) : (
            <div className="w-40 shrink-0 bg-transparent"></div>
          )}

          <div className="flex-1 flex flex-col justify-end">
            {!isGrouped && (
              <div className={`flex items-baseline gap-3 mb-2 px-1 ${isMine ? "justify-end flex-row-reverse" : "justify-start flex-row"}`}>
                <span className={`text-[15px] font-bold tracking-wide ${isGM ? "text-amber-400" : "text-zinc-300"}`}>{message.authorName}</span>
                {isGM && <span className="text-[10px] font-bold text-amber-500/80 border border-amber-500/40 px-1.5 py-0.5 bg-amber-500/10">GM</span>}
                <span className="text-xs text-zinc-500 tracking-wide">{timeString}</span>
              </div>
            )}

            <div 
              onContextMenu={handleContextMenu}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEndOrMove}
              onTouchMove={handleTouchEndOrMove}
              className={`flex-1 flex flex-col justify-center items-center min-h-[6rem] px-8 py-5 shadow-md border-2 relative cursor-pointer ${
              isMine ? "bg-zinc-800 border-zinc-600 text-white hover:border-zinc-500" : (isGM ? "bg-amber-950/40 border-amber-700/50 text-amber-50" : "bg-zinc-900 border-zinc-600 text-zinc-100")
            }`}>
              {renderMessageContent()}
            </div>
          </div>
        </div>
      </div>
      
      {/* 메뉴 렌더링 호출 */}
      {renderMenu()}
    </div>
  );
}