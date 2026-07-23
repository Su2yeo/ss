"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { doc, updateDoc, deleteField, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { RoomInfo, Handout } from "@/types/room";

interface HandoutBoardProps {
  roomId: string;
  room: RoomInfo;
  isGM: boolean;
}

export function HandoutBoard({ roomId, room, isGM }: HandoutBoardProps) {
  // 🔥 Next.js 환경에서 createPortal을 안전하게 쓰기 위한 상태 추가
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [mode, setMode] = useState<"list" | "view" | "edit" | "create">("list");
  const [currentHandout, setCurrentHandout] = useState<Handout | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 🔥 이미지를 클릭했을 때 원본 크기로 띄워줄 이미지의 주소를 저장하는 공간
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // Firestore에서 실시간 동기화된 핸드아웃 목록 가져오기
  const handouts = room.handouts || {};
  const handoutList = Object.values(handouts).sort((a, b) => {
    const timeA = a.createdAt?.toMillis() || 0;
    const timeB = b.createdAt?.toMillis() || 0;
    return timeB - timeA; // 최신순 정렬
  });

  // 플레이어는 공개된 것만, GM은 전부 다 볼 수 있음
  const visibleHandouts = isGM ? handoutList : handoutList.filter((h) => h.isRevealed);

  // 핸드아웃 저장 (생성 및 수정)
  const handleSave = async () => {
    if (!title.trim()) return alert("제목을 입력해주세요.");
    setIsSaving(true);
    try {
      const id = mode === "edit" && currentHandout ? currentHandout.id : Date.now().toString();
      const handoutData: Handout = {
        id,
        title,
        content,
        imageUrl,
        isRevealed,
        createdAt: mode === "edit" && currentHandout ? currentHandout.createdAt : Timestamp.now(),
      };

      await updateDoc(doc(db, "rooms", roomId), {
        [`handouts.${id}`]: handoutData,
      });

      setMode("list");
      setCurrentHandout(null);
    } catch (error) {
      console.error("핸드아웃 저장 실패:", error);
      alert("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 핸드아웃 삭제
  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 핸드아웃을 삭제하시겠습니까?")) return;
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        [`handouts.${id}`]: deleteField(),
      });
      setMode("list");
      setCurrentHandout(null);
    } catch (error) {
      console.error("핸드아웃 삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  // 공개 상태 즉시 토글 (GM 전용)
  const toggleReveal = async (e: React.MouseEvent, handout: Handout) => {
    e.stopPropagation(); // 카드 클릭 이벤트 막기
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        [`handouts.${handout.id}.isRevealed`]: !handout.isRevealed,
      });
    } catch (error) {
      console.error("상태 변경 실패:", error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900 text-zinc-200">
      
      {/* --- 목록 화면 --- */}
      {mode === "list" && (
        <>
          <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
            <h2 className="font-bold text-sm">📜 핸드아웃 목록</h2>
            {isGM && (
              <button
                onClick={() => {
                  setTitle(""); setContent(""); setImageUrl(""); setIsRevealed(false);
                  setMode("create");
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded transition-colors"
              >
                + 새 핸드아웃
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {visibleHandouts.length === 0 ? (
              <div className="text-center text-zinc-500 mt-10 text-sm">표시할 핸드아웃이 없습니다.</div>
            ) : (
              visibleHandouts.map((handout) => (
                <div
                  key={handout.id}
                  onClick={() => { setCurrentHandout(handout); setMode("view"); }}
                  className="bg-zinc-800 border border-zinc-700 p-3 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-sm group-hover:text-indigo-300 transition-colors">{handout.title}</h3>
                    {isGM && (
                      <button
                        onClick={(e) => toggleReveal(e, handout)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          handout.isRevealed ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800" : "bg-rose-900/50 text-rose-400 border border-rose-800"
                        }`}
                      >
                        {handout.isRevealed ? "공개됨" : "비공개"}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2">{handout.content || "내용 없음"}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* --- 열람 화면 --- */}
      {mode === "view" && currentHandout && (
        <div className="flex flex-col h-full">
          <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950 shrink-0">
            <button onClick={() => setMode("list")} className="text-zinc-400 hover:text-white text-xs font-bold">
              ◀ 목록으로
            </button>
            {isGM && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTitle(currentHandout.title); setContent(currentHandout.content);
                    setImageUrl(currentHandout.imageUrl || ""); setIsRevealed(currentHandout.isRevealed);
                    setMode("edit");
                  }}
                  className="text-xs text-amber-500 hover:text-amber-400 font-bold px-2"
                >
                  수정
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 relative">
            <h2 className="text-xl font-bold text-white mb-4">{currentHandout.title}</h2>
            {currentHandout.imageUrl && (
              <img 
                src={currentHandout.imageUrl} 
                alt={currentHandout.title} 
                onClick={() => setEnlargedImage(currentHandout.imageUrl!)}
                className="w-full rounded-lg mb-4 object-contain max-h-[300px] bg-black/50 cursor-pointer hover:opacity-80 transition-opacity" 
                title="클릭해서 크게 보기"
              />
            )}
            <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{currentHandout.content}</div>
          </div>
        </div>
      )}

      {/* --- 작성 / 수정 화면 (GM 전용) --- */}
      {(mode === "create" || mode === "edit") && isGM && (
        <div className="flex flex-col h-full">
          <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950 shrink-0">
            <button onClick={() => setMode("list")} className="text-zinc-400 hover:text-white text-xs font-bold">
              ◀ 취소
            </button>
            <div className="flex gap-2 items-center">
              {mode === "edit" && currentHandout && (
                <button onClick={() => handleDelete(currentHandout.id)} className="text-xs text-red-500 hover:text-red-400 font-bold px-2">
                  삭제
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-1.5 rounded transition-colors disabled:opacity-50"
              >
                {isSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">제목 (필수)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-950 text-sm p-2 rounded border border-zinc-800 outline-none focus:border-indigo-500 text-white"
                placeholder="핸드아웃 제목"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">이미지 URL (선택)</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-zinc-950 text-sm p-2 rounded border border-zinc-800 outline-none focus:border-indigo-500 text-white"
                placeholder="https://..."
              />
            </div>
            <label className="flex items-center gap-2 bg-zinc-950 p-2 rounded border border-zinc-800 cursor-pointer w-max">
              <input
                type="checkbox"
                checked={isRevealed}
                onChange={(e) => setIsRevealed(e.target.checked)}
                className="w-4 h-4 accent-indigo-500"
              />
              <span className="text-sm font-bold text-zinc-300">플레이어에게 공개하기</span>
            </label>
            <div className="flex-1 flex flex-col min-h-[200px]">
              <label className="block text-[11px] text-zinc-400 mb-1">내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full flex-1 bg-zinc-950 text-sm p-2 rounded border border-zinc-800 outline-none focus:border-indigo-500 text-white resize-none"
                placeholder="핸드아웃 내용을 작성하세요..."
              />
            </div>
          </div>
        </div>
      )}

      {/* 🔥 이미지 확대 모달 (createPortal을 사용하여 브라우저 최상단으로 분리) */}
      {mounted && enlargedImage && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 cursor-zoom-out backdrop-blur-sm"
          onClick={() => setEnlargedImage(null)}
        >
          <img 
            src={enlargedImage} 
            alt="Enlarged" 
            className="max-w-full max-h-full object-contain rounded-md shadow-2xl"
          />
          <button 
            className="absolute top-4 right-6 text-white text-3xl font-bold opacity-70 hover:opacity-100"
            onClick={() => setEnlargedImage(null)}
          >
            &times;
          </button>
        </div>,
        document.body
      )}

    </div>
  );
}