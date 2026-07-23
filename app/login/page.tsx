"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider, User } from "firebase/auth";
import { auth } from "@/firebase/config";
import { useRouter } from "next/navigation";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 로그인 상태가 바뀔 때마다(로그인/로그아웃) 자동으로 실행되는 부분
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push("/"); // 로그인 성공하면 메인(/)으로 이동
    } catch (error) {
      console.error("로그인 실패:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">불러오는 중...</div>;
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-900 text-white">
      {/* 🔥 화면에 보이는 제목을 김냄비로 수정했습니다! */}
      <h1 className="text-2xl font-bold">김냄비</h1>

      {user ? (
        <div className="flex flex-col items-center gap-3">
          <p>{user.displayName}님, 펌피럽하세요.</p>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-500 px-4 py-2 hover:bg-red-600"
          >
            로그아웃
          </button>
        </div>
      ) : (
        <button
          onClick={handleLogin}
          className="rounded-lg bg-blue-500 px-4 py-2 hover:bg-blue-600"
        >
          Google로 로그인
        </button>
      )}
    </div>
  );
}