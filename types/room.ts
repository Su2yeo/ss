import type { Timestamp } from "firebase/firestore";

export type MemberRole = "gm" | "player";

export interface RoomMember {
  displayName: string;
  photoURL?: string | null;
  role: MemberRole;
  joinedAt: Timestamp | null;
}

export interface RoomInfo {
  id: string;
  name: string;
  gmId: string;
  createdAt: Timestamp | null;
  members: Record<string, RoomMember>; // key = uid
}