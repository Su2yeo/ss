"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { MapToken } from "@/types/map";

// 맵 위 토큰들을 실시간으로 구독
export function useMapTokens(roomId: string): MapToken[] {
  const [tokens, setTokens] = useState<MapToken[]>([]);

  useEffect(() => {
    if (!roomId) return;
    const tokensRef = collection(db, "rooms", roomId, "tokens");
    const unsubscribe = onSnapshot(tokensRef, (snapshot) => {
      const list = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as MapToken)
      );
      setTokens(list);
    });
    return () => unsubscribe();
  }, [roomId]);

  return tokens;
}

export async function addToken(
  roomId: string,
  data: { label: string; color: string; x: number; y: number; ownerUid: string }
) {
  const tokensRef = collection(db, "rooms", roomId, "tokens");
  await addDoc(tokensRef, data);
}

export async function moveToken(roomId: string, tokenId: string, x: number, y: number) {
  const tokenRef = doc(db, "rooms", roomId, "tokens", tokenId);
  await updateDoc(tokenRef, { x, y });
}

export async function removeToken(roomId: string, tokenId: string) {
  const tokenRef = doc(db, "rooms", roomId, "tokens", tokenId);
  await deleteDoc(tokenRef);
}