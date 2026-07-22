"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/config";

interface UseAuthResult {
  user: User | null;
  loading: boolean;
}

/**
 * 현재 로그인된 Firebase 유저 정보를 실시간으로 알려주는 훅.
 * 로그인/로그아웃 될 때마다 자동으로 갱신된다.
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading };
}