"use client";

import { useState, useRef } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/firebase/config";
import type { Character } from "@/types/character";
import { ShinobigamiSheet } from "@/components/Character/Sheets/ShinobigamiSheet"; // 🔥 분리한 컴포넌트 불러오기

interface CharacterEditModalProps {
  roomId: string;
  character: Character;
  onClose: () => void;
  onUpdate: (charId: string, updates: Partial<Character>) => Promise<void>;
}

export function CharacterEditModal({ roomId, character, onClose, onUpdate }: CharacterEditModalProps) {
  const [name, setName] = useState(character.name);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(character.avatarUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [sheetData, setSheetData] = useState<any>(character.sheetData || {});
  const [modalSize, setModalSize] = useState({ width: 600, height: 700 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("이름을 입력해주세요.");
    setIsSaving(true);
    try {
      let finalAvatarUrl = character.avatarUrl;
      if (avatarFile) {
        const fileRef = ref(storage, `rooms/${roomId}/characters/${character.id}_${Date.now()}`);
        await uploadBytes(fileRef, avatarFile);
        finalAvatarUrl = await getDownloadURL(fileRef);
      }
      await onUpdate(character.id, { name, avatarUrl: finalAvatarUrl, sheetData });
      onClose();
    } catch (error) {
      alert("프로필 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = modalSize.width;
    const startHeight = modalSize.height;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(400, startWidth + (moveEvent.clientX - startX));
      const newHeight = Math.max(500, startHeight + (moveEvent.clientY - startY));
      setModalSize({ width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const handleChange = (field: string, value: any) => {
    setSheetData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div 
        style={{ width: modalSize.width, height: modalSize.height }}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl flex flex-col relative max-w-[95vw] max-h-[95vh]"
      >
        <h2 className="text-xl font-bold text-white mb-4 shrink-0">프로필 설정</h2>
        
        <div className="flex gap-4 mb-2 shrink-0">
          <div onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors relative shrink-0">
            {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <span className="text-zinc-500 text-xs">이미지</span>}
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          
          <div className="flex-1 flex flex-col justify-center">
            <label className="text-xs font-semibold text-zinc-400 mb-1">캐릭터 이름</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-zinc-800 text-white px-3 py-2 rounded-xl border border-zinc-700 focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        {/* 🔥 분리한 시노비가미 시트 컴포넌트를 여기에 렌더링! */}
        {character.sheetType === "shinobigami" && (
          <ShinobigamiSheet sheetData={sheetData} onChange={handleChange} />
        )}

        <div className="flex gap-3 mt-4 shrink-0">
          <button onClick={onClose} disabled={isSaving} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 transition-colors">취소</button>
          <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors">{isSaving ? "저장 중..." : "저장하기"}</button>
        </div>

        <div 
          onMouseDown={handleMouseDownResize}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-50 flex items-end justify-end p-1 opacity-50 hover:opacity-100 transition-opacity"
        >
          <div className="w-3 h-3 border-r-2 border-b-2 border-zinc-500 rounded-br-sm" />
        </div>
      </div>
    </div>
  );
}