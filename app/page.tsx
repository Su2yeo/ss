"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/config";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        // 로그인 되어 있으면 -> 로비로 이동
        router.push("/lobby");
      } else {
        // 로그인 안 되어 있으면 -> 로그인 페이지로 이동
        router.push("/login");
      }
      setChecking(false);
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-900 text-white">
      <p>{checking ? "확인 중..." : "이동 중..."}</p>
    </div>
  );
}