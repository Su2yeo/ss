"use client";

import { useState, useEffect } from "react";
import { collection, doc, setDoc, onSnapshot, query, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Character, SheetType } from "@/types/character";
import { initialShinobigamiData } from "@/types/rules/shinobigami"; // 🔥 초기값 불러오기

export function useCharacters(roomId: string) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingChars, setLoadingChars] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    const charsRef = collection(db, "rooms", roomId, "characters");
    const q = query(charsRef);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedChars = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Character));
        setCharacters(fetchedChars);
        setLoadingChars(false);
      },
      (error) => {
        console.error("캐릭터 목록 불러오기 실패:", error);
        setLoadingChars(false);
      }
    );
    return () => unsubscribe();
  }, [roomId]);

  const createCharacter = async (name: string, ownerId: string, sheetType: SheetType = "basic") => {
    try {
      const charRef = doc(collection(db, "rooms", roomId, "characters"));
      
      await setDoc(charRef, {
        id: charRef.id,
        roomId,
        name,
        ownerId,
        avatarUrl: null,
        sheetType,
        // 🔥 깔끔해진 데이터 삽입
        sheetData: sheetType === "shinobigami" ? initialShinobigamiData : null,
      });
    } catch (error) {
      console.error("캐릭터 생성 실패:", error);
      throw error;
    }
  };

  const assignCharacter = async (charId: string, newOwnerId: string) => {
    try {
      const charRef = doc(db, "rooms", roomId, "characters", charId);
      await updateDoc(charRef, { ownerId: newOwnerId });
    } catch (error) {
      console.error("캐릭터 권한 변경 실패:", error);
      throw error;
    }
  };

  const updateCharacter = async (charId: string, updates: Partial<Character>) => {
    try {
      const charRef = doc(db, "rooms", roomId, "characters", charId);
      await updateDoc(charRef, updates);
    } catch (error) {
      console.error("캐릭터 수정 실패:", error);
      throw error;
    }
  };

  return { characters, loadingChars, createCharacter, assignCharacter, updateCharacter };
}