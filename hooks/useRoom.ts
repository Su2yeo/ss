"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  query,  // 방 목록 필터링을 위해 새로 추가됨
  where   // 방 목록 필터링을 위해 새로 추가됨
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { RoomInfo } from "@/types/room";

interface AuthedUser {
  uid: string;
  displayName: string;
  photoURL?: string | null;
}

/**
 * 새 룸을 만들고, 만든 사람을 GM으로 등록한다.
 */
export async function createRoom(name: string, user: AuthedUser): Promise<string> {
  const roomsRef = collection(db, "rooms");
  const docRef = await addDoc(roomsRef, {
    name: name.trim() || "이름 없는 방",
    gmId: user.uid,
    createdAt: serverTimestamp(),
    members: {
      [user.uid]: {
        displayName: user.displayName,
        photoURL: user.photoURL ?? null,
        role: "gm",
        joinedAt: serverTimestamp(),
      },
    },
  });
  return docRef.id;
}

/**
 * roomId로 방에 참가한다.
 */
export async function joinRoom(roomId: string, user: AuthedUser): Promise<void> {
  const roomRef = doc(db, "rooms", roomId);
  const snapshot = await getDoc(roomRef);

  if (!snapshot.exists()) {
    throw new Error("존재하지 않는 방입니다. 코드를 다시 확인해주세요.");
  }

  const data = snapshot.data();
  if (data.members?.[user.uid]) {
    return; // 이미 멤버면 재등록하지 않음
  }

  await updateDoc(roomRef, {
    [`members.${user.uid}`]: {
      displayName: user.displayName,
      photoURL: user.photoURL ?? null,
      role: "player",
      joinedAt: serverTimestamp(),
    },
  });
}

interface UseRoomInfoResult {
  room: RoomInfo | null;
  loading: boolean;
  error: string | null;
}

/**
 * 특정 룸 정보를 실시간으로 구독한다.
 */
export function useRoomInfo(roomId: string): UseRoomInfoResult {
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;

    setLoading(true);
    setError(null);

    const roomRef = doc(db, "rooms", roomId);
    const unsubscribe = onSnapshot(
      roomRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setRoom(null);
          setError("존재하지 않는 방입니다.");
        } else {
          setRoom({ id: snapshot.id, ...snapshot.data() } as RoomInfo);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[useRoomInfo] snapshot error:", err);
        setError("방 정보를 불러오지 못했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  return { room, loading, error };
}

/**
 * 내가 참가 중인 방 목록을 실시간으로 가져온다.
 */
export function useMyRooms(userId: string | undefined) {
  const [myRooms, setMyRooms] = useState<RoomInfo[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    if (!userId) {
      setMyRooms([]);
      setLoadingRooms(false);
      return;
    }

    const roomsRef = collection(db, "rooms");
    // members 안에 내 UID가 있고, 역할이 gm이나 player인 방만 검색
    const q = query(
      roomsRef,
      where(`members.${userId}.role`, "in", ["gm", "player"])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedRooms = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as RoomInfo)
        );
        
        fetchedRooms.sort((a, b) => {
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
          return timeB - timeA;
        });

        setMyRooms(fetchedRooms);
        setLoadingRooms(false);
      },
      (error) => {
        console.error("내 방 목록 불러오기 실패:", error);
        setLoadingRooms(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { myRooms, loadingRooms };
}