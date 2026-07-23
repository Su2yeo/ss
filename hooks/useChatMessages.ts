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
  doc,
  updateDoc,
  deleteDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { ChatMessage, NewChatMessageInput } from "@/types/chat";

// 🔥 본편과 잡담이 나뉘므로 넉넉하게 100개로 증가
const PAGE_SIZE = 100; 

interface UseChatMessagesResult {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (input: NewChatMessageInput) => Promise<void>;
  sending: boolean;
  updateMessage: (id: string, newContent: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
}

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
          .reverse(); 
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