"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc, // 🔥 추가
  updateDoc, // 🔥 추가
  deleteDoc, // 🔥 추가
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { ChatMessage, NewChatMessageInput } from "@/types/chat";

const PAGE_SIZE = 50;

interface UseChatMessagesResult {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (input: NewChatMessageInput) => Promise<void>;
  sending: boolean;
  updateMessage: (id: string, newContent: string) => Promise<void>; // 🔥 추가
  deleteMessage: (id: string) => Promise<void>; // 🔥 추가
}

/**
 * rooms/{roomId}/chat 컬렉션을 실시간 구독한다.
 *
 * 비용 절감을 위해 최근 PAGE_SIZE개만 구독하며,
 * "오래된 메시지 불러오기"(페이지네이션)는 로그 검색 단계에서 별도 구현 예정.
 */
export function useChatMessages(roomId: string): UseChatMessagesResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const unsubRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!roomId) return;

    setLoading(true);
    setError(null);

    const chatRef = collection(db, "rooms", roomId, "chat");
    const q = query(chatRef, orderBy("createdAt", "desc"), limit(PAGE_SIZE));

    unsubRef.current = onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as ChatMessage)
          .reverse(); // 오래된 -> 최신 순으로 정렬해서 렌더링
        setMessages(next);
        setLoading(false);
      },
      (err) => {
        console.error("[useChatMessages] snapshot error:", err);
        setError("채팅을 불러오지 못했습니다.");
        setLoading(false);
      }
    );

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [roomId]);

  const sendMessage = useCallback(
    async (input: NewChatMessageInput) => {
      if (!roomId || !input.content.trim()) return;
      setSending(true);
      try {
        const chatRef = collection(db, "rooms", roomId, "chat");
        await addDoc(chatRef, {
          ...input,
          content: input.content.trim(),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("[useChatMessages] sendMessage error:", err);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [roomId]
  );

  // 🔥 메시지 수정 함수 추가
  const updateMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!roomId || !newContent.trim()) return;
      try {
        const messageRef = doc(db, "rooms", roomId, "chat", messageId);
        await updateDoc(messageRef, {
          content: newContent.trim(),
        });
      } catch (err) {
        console.error("[useChatMessages] updateMessage error:", err);
        alert("메시지 수정에 실패했습니다.");
      }
    },
    [roomId]
  );

  // 🔥 메시지 삭제 함수 추가
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!roomId) return;
      try {
        const messageRef = doc(db, "rooms", roomId, "chat", messageId);
        await deleteDoc(messageRef);
      } catch (err) {
        console.error("[useChatMessages] deleteMessage error:", err);
        alert("메시지 삭제에 실패했습니다.");
      }
    },
    [roomId]
  );

  return { messages, loading, error, sendMessage, sending, updateMessage, deleteMessage };
}