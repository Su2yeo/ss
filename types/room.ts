import type { Timestamp } from "firebase/firestore";

export type MemberRole = "gm" | "player";

export interface RoomMember {
  displayName: string;
  photoURL?: string | null;
  role: MemberRole;
  joinedAt: Timestamp | null;
}

export interface Handout {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  isRevealed: boolean;
  createdAt: Timestamp | null;
}

export interface MapItem {
  id: string;
  type: "image" | "brush" | "eraser" | "rect" | "circle" | "line" | "text";
  url?: string;
  x: number;
  y: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  points?: number[];
  width?: number;
  height?: number;
  radius?: number;
  color?: string;
  text?: string;
}

export interface MapLayer {
  id: string;
  name: string;
  isLocked: boolean;
  isVisible?: boolean;
  items: MapItem[];
}

export interface SavedScene {
  id: string;
  name: string;
  mapLayers: MapLayer[];
  thumbnailUrl?: string; 
}

// 🔥 에셋 갤러리(이미지 모음)를 위한 데이터 타입 추가
export interface MapAsset {
  id: string;
  name: string;
  url: string;
  uploadedBy: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  gmId: string;
  createdAt: Timestamp | null;
  members: Record<string, RoomMember>;
  handouts?: Record<string, Handout>;
  mapLayers?: MapLayer[];
  savedScenes?: SavedScene[];
  textMacros?: { id: string; name: string; content: string }[];
  assets?: MapAsset[]; // 🔥 맵 이미지 에셋 갤러리
}