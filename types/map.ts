export interface MapToken {
  id: string;
  label: string;   // 토큰에 표시할 짧은 글자 (이름 앞글자 등)
  color: string;    // 토큰 색상 (hex)
  x: number;
  y: number;
  ownerUid: string; // 이 토큰을 만든 사람
}

export interface MapSettings {
  backgroundUrl: string | null;
}