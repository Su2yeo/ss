"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createRoom, joinRoom, useMyRooms } from "@/hooks/useRoom";
// 🔥 진행상황을 저장하기 위해 Firebase 함수와 설정 추가
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "@/firebase/config";

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

// 🔥 날짜를 "2026. 07. 24." 형식으로 예쁘게 변환해 주는 기능
  const formatRoomDate = (createdAt: any) => {
    if (!createdAt) return "날짜 없음";
    try {
      const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt.seconds * 1000);
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return "날짜 없음";
    }
  };

  // 🔥 GM이 진행상황(준비/진행중/완료)을 변경했을 때 바로 저장하는 기능
  const handleStatusChange = async (roomId: string, newStatus: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation(); // 방 클릭으로 입장되는 것 방지
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        status: newStatus,
      });
    } catch (err) {
      console.error("진행상황 변경 실패:", err);
      alert("진행상황 변경에 실패했습니다.");
    }
  };

  // 🔥 방 나가기 기능: 내 정보를 방 멤버 목록에서 삭제합니다.
  const handleLeaveRoom = async (roomId: string, roomName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 이 버튼을 눌렀을 때 방 안으로 입장해버리는 것을 막아줍니다.
    
    if (!user?.uid) return;
    if (!confirm(`정말로 '${roomName}' 방에서 나가시겠습니까?\n(다시 들어오려면 초대 코드가 필요합니다)`)) return;

    try {
      await updateDoc(doc(db, "rooms", roomId), {
        [`members.${user.uid}`]: deleteField() // 내 UID에 해당하는 멤버 정보를 데이터베이스에서 깔끔하게 지웁니다.
      });
      alert("방에서 나갔습니다.");
    } catch (err) {
      console.error("방 나가기 실패:", err);
      alert("방 나가기에 실패했습니다.");
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
          <h1 className="text-2xl font-bold text-zinc-100">{user.displayName}펌피럽</h1>
          <p className="text-sm text-zinc-400">씬나게놀아볼까요옹?</p>
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
                {myRooms.map((room: any) => {
                  const currentStatus = room.status || "준비";
                  const isGM = room.gmId === user.uid;

                  return (
                    <div
                      key={room.id}
                      className="flex flex-col p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl border border-zinc-700 hover:border-blue-500/50 transition-all group"
                    >
                      {/* 상단: 방 이름, GM 표식, 생성일 & 진행상황 선택 */}
                      <div className="flex justify-between items-start gap-3">
                        <div 
                          onClick={() => router.push(`/room/${room.id}`)}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-zinc-200 group-hover:text-blue-400 text-lg">
                              {room.name}
                            </span>
                            {isGM && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/40 font-bold">
                                GM
                              </span>
                            )}
                          </div>
                          {/* 방 생성일 표시 */}
                          <span className="text-xs text-zinc-400 mt-1 block">
                            생성일: {formatRoomDate(room.createdAt)}
                          </span>
                        </div>

                        {/* 진행상황 선택지 */}
                        <div className="shrink-0">
                          {isGM ? (
                            <select
                              value={currentStatus}
                              onChange={(e) => handleStatusChange(room.id, e.target.value, e)}
                              onClick={(e) => e.stopPropagation()}
                              className={`text-xs font-bold px-2.5 py-1 rounded-lg border outline-none cursor-pointer transition-colors ${
                                currentStatus === "준비"
                                  ? "bg-blue-950/80 text-blue-400 border-blue-800/80"
                                  : currentStatus === "진행중"
                                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/80"
                                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
                              }`}
                            >
                              <option value="준비" className="bg-zinc-900 text-blue-400">준비</option>
                              <option value="진행중" className="bg-zinc-900 text-emerald-400">진행중</option>
                              <option value="완료" className="bg-zinc-900 text-zinc-400">완료</option>
                            </select>
                          ) : (
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                              currentStatus === "준비"
                                ? "bg-blue-950/80 text-blue-400 border-blue-800/80"
                                : currentStatus === "진행중"
                                ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/80"
                                : "bg-zinc-800 text-zinc-400 border-zinc-700"
                            }`}>
                              {currentStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 🔥 추가된 참가자 목록 영역 (GM이 맨 앞에 오도록 정렬) */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {Object.values(room.members || {})
                          .sort((a: any, b: any) => {
                            // 방장(GM)을 찾아 맨 앞으로 순서를 바꿉니다.
                            if (a.role === "gm" && b.role !== "gm") return -1;
                            if (a.role !== "gm" && b.role === "gm") return 1;
                            return 0; 
                          })
                          .map((member: any, idx: number) => (
                          <div 
                            key={idx} 
                            className="flex items-center gap-1.5 bg-zinc-900/80 px-2.5 py-1.5 rounded-full border border-zinc-700/60"
                            title={member.role === "gm" ? "GM" : "플레이어"}
                          >
                            {member.photoURL ? (
                              <img src={member.photoURL} alt={member.displayName} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300">
                                {member.displayName?.slice(0, 1)}
                              </div>
                            )}
                            <span className="text-[11px] text-zinc-300 font-medium">
                              {member.displayName}
                              {member.role === "gm" && <span className="ml-1 text-amber-500">GM</span>}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* 하단: 방 코드 및 방 나가기 버튼 */}
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-zinc-700/40">
                        <span className="text-xs text-zinc-500 font-mono">
                          코드: {room.id}
                        </span>
                        <button 
                          onClick={(e) => handleLeaveRoom(room.id, room.name, e)}
                          className="text-xs px-2.5 py-1.5 bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-red-300 rounded-lg border border-red-900/50 transition-colors font-medium cursor-pointer relative z-10"
                        >
                          방 나가기
                        </button>
                      </div>
                    </div>
                  );
                })}
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
            <h2 className="text-sm font-semibold text-zinc-300">놀기신청하기</h2>
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
            <h2 className="text-sm font-semibold text-zinc-300">야옹</h2>
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