"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import type { MessageType } from "@/types/chat";
import { rollDice } from "@/utils/dice";

interface ChatInputProps {
  onSend: (
    content: string, 
    type: Exclude<MessageType, "system">,
    diceResult?: { formula: string; rolls: number[]; total: number }
  ) => Promise<void>;
  sending: boolean;
  isGM: boolean;
  // 🔥 현재 열려있는 채팅 탭이 무엇인지 알려주는 속성 추가
  chatCategory: "main" | "ooc"; 
}

export function ChatInput({ onSend, sending, isGM, chatCategory }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [asGM, setAsGM] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    const rawContent = value.trim();
    if (!rawContent || sending) return;
    setValue("");

    let finalType: Exclude<MessageType, "system"> = asGM ? "gm" : "chat";
    let finalContent = rawContent;
    let diceResultData = undefined;

    // 주사위 굴림 감지 (/r 1d100)
    if (rawContent.startsWith("/r ")) {
      const formula = rawContent.replace("/r ", "");
      const result = rollDice(formula);
      if (result) {
        finalType = "dice";
        diceResultData = result;
        finalContent = `${formula} 주사위를 굴렸습니다.`;
      }
    }

    try {
      await onSend(finalContent, finalType, diceResultData);
    } catch {
      setValue(rawContent);
    }
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-900 p-3">
      {isGM && (
        <label className="flex items-center gap-1.5 mb-2 text-xs text-zinc-400 select-none cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={asGM}
            onChange={(e) => setAsGM(e.target.checked)}
            className="accent-amber-500"
          />
          GM 메시지로 전송
        </label>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          // 🔥 탭에 따라 입력창 안내 텍스트 변경
          placeholder={chatCategory === "main" ? "본편 롤플레이 입력... (주사위: /r 1d100)" : "플레이어 잡담(OOC) 입력..."}
          rows={1}
          className="flex-1 resize-none rounded-xl bg-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 px-4 py-2.5 max-h-40 focus:outline-none focus:ring-1 focus:ring-zinc-600"
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || sending}
          className="rounded-xl bg-zinc-100 text-zinc-900 text-sm font-medium px-4 py-2.5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors"
        >
          전송
        </button>
      </div>
    </div>
  );
}