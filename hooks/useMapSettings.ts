"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { MapSettings } from "@/types/map";

// 방의 배경 지도 이미지 URL을 실시간으로 구독
export function useMapSettings(roomId: string): MapSettings {
  const [settings, setSettings] = useState<MapSettings>({ backgroundUrl: null });

  useEffect(() => {
    if (!roomId) return;
    const ref = doc(db, "rooms", roomId, "map", "settings");
    const unsubscribe = onSnapshot(ref, (snap) => {
      setSettings(snap.exists() ? (snap.data() as MapSettings) : { backgroundUrl: null });
    });
    return () => unsubscribe();
  }, [roomId]);

  return settings;
}

export async function setMapBackground(roomId: string, url: string) {
  const ref = doc(db, "rooms", roomId, "map", "settings");
  await setDoc(ref, { backgroundUrl: url.trim() || null }, { merge: true });
}