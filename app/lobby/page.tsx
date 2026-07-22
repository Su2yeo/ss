"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createRoom, joinRoom, useMyRooms } from "@/hooks/useRoom";

export default function LobbyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 1단계에서 만든 훅을 사용해 내 방 목록 가져오기
  const { myRooms, loadingRooms } = useMyRooms(user?.uid);

  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        불러오는 중...
      </div>
    );
  }

  const authedUser = {
    uid: user.uid,
    displayName: user.displayName ?? "이름없음",
    photoURL: user.photoURL,
  };

  const handleCreate = async () => {
    setError(null);
    setCreating(true);
    try {
      const roomId = await createRoom(roomName, authedUser);
      router.push(`/room/${roomId}`);
    } catch (err) {
      console.error(err);
      setError("방 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setError(null);
    setJoining(true);
    try {
      await joinRoom(joinCode.trim(), authedUser);
      router.push(`/room/${joinCode.trim()}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "방 참가에 실패했습니다.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12">
      {/* 헤더 (마이페이지 느낌) */}
      <div className="max-w-5xl mx-auto mb-10 flex items-center gap-4 border-b border-zinc-800 pb-6">
        {user.photoURL ? (
          <img src={user.photoURL} alt="프로필" className="w-12 h-12 rounded-full border border-zinc-700" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold">
            {user.displayName?.slice(0, 1)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{user.displayName}님의 로비</h1>
          <p className="text-sm text-zinc-400">TRPG 플랫폼에 오신 것을 환영합니다.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* 왼쪽 섹션: 내 방 목록 */}
        <div className="flex-1 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-zinc-300">참가 중인 세션</h2>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 h-[500px] overflow-y-auto">
            {loadingRooms ? (
              <p className="text-center text-zinc-500 py-10">방 목록을 불러오는 중...</p>
            ) : myRooms.length === 0 ? (
              <p className="text-center text-zinc-500 py-10">아직 참가 중인 방이 없습니다.<br/>새로운 방을 만들거나 초대 코드로 참가해보세요!</p>
            ) : (
              <div className="flex flex-col gap-3">
                {myRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => router.push(`/room/${room.id}`)}
                    className="flex flex-col text-left p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl border border-zinc-700 hover:border-blue-500/50 transition-all group"
                  >
                    <span className="font-bold text-zinc-200 group-hover:text-blue-400 text-lg">
                      {room.name}
                    </span>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-zinc-500 font-mono">
                        코드: {room.id}
                      </span>
                      {room.gmId === user.uid && (
                         <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/40 font-bold">
                           GM
                         </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽 섹션: 방 생성 & 참가 */}
        <div className="w-full md:w-80 flex flex-col gap-6">
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 px-4 py-3 rounded-lg border border-red-500/20">
              {error}
            </p>
          )}

          {/* 방 만들기 */}
          <div className="flex flex-col gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-zinc-300">새로운 모험 시작하기</h2>
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="방 이름 (예: 독이 든 수프)"
              className="rounded-xl bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 border border-transparent focus:outline-none focus:border-blue-500/50 focus:bg-zinc-800/80 transition-colors"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !roomName.trim()}
              className="rounded-xl bg-zinc-100 text-zinc-900 text-sm font-bold px-4 py-3 disabled:opacity-40 hover:bg-white transition-colors"
            >
              {creating ? "만드는 중..." : "방 만들기"}
            </button>
          </div>

          {/* 방 참가하기 */}
          <div className="flex flex-col gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-zinc-300">초대 코드로 참가하기</h2>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="방장에게 받은 코드를 붙여넣으세요"
              className="rounded-xl bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 border border-transparent focus:outline-none focus:border-blue-500/50 focus:bg-zinc-800/80 transition-colors"
            />
            <button
              onClick={handleJoin}
              disabled={joining || !joinCode.trim()}
              className="rounded-xl bg-blue-600 text-white text-sm font-bold px-4 py-3 disabled:opacity-40 hover:bg-blue-500 transition-colors"
            >
              {joining ? "확인 중..." : "참가하기"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}