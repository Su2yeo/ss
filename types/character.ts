import type { ShinobigamiData } from "./rules/shinobigami"; // 🔥 룰 데이터 불러오기

export type SheetType = "basic" | "shinobigami";

export interface Character {
  id: string;
  roomId: string;
  name: string;
  avatarUrl?: string | null;
  ownerId: string;
  sheetType: SheetType;
  
  // 🔥 나중에 D&D나 CoC가 추가되면 여기에 | CocData | DnDData 식으로 이어붙이기만 하면 됩니다!
  sheetData?: ShinobigamiData | any; 
}