import type { Timestamp } from "firebase/firestore";

/**
 * 지원하는 메시지 타입
 */
export type MessageType = "chat" | "gm" | "system" | "dice";

export interface ChatMessage {
  id: string;
  type: MessageType;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string | null;
  content: string;
  createdAt: Timestamp | null;
  // 🔥 본편/잡담을 구분하는 꼬리표 추가 (기존 채팅 호환성을 위해 선택적(?)으로 설정)
  category?: "main" | "ooc"; 
  diceResult?: {
    formula: string;
    rolls: number[];
    total: number;
  };
}

export interface NewChatMessageInput {
  type: MessageType;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string | null;
  content: string;
  // 🔥 새로 전송하는 메시지는 반드시 카테고리를 가지도록 설정
  category: "main" | "ooc"; 
  diceResult?: {
    formula: string;
    rolls: number[];
    total: number;
  };
}