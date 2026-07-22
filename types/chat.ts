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
  diceResult?: {
    formula: string;
    rolls: number[];
    total: number;
  };
}