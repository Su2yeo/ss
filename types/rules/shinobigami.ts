export interface ShinobigamiData {
  age: string; gender: string; pcNumber: string; clan: string; subClan: string;
  additionalHp: number; style: string; meritPoints: number; nemesis: string; belief: string;
  publicIdentity: string; rank: string; specialty: string;

  mokryun: boolean; makyegonghak: boolean; gaps: boolean[];
  skills: Record<string, { isChecked: boolean; value: number }>;
  clanCondition: string; advantage: string; disadvantage: string;

  hp: { tech: boolean; body: boolean; nin: boolean; plot: boolean; tactics: boolean; magic: boolean; };
  ninpo: Array<{ name: string; type: string; skill: string; range: string; cost: string; effect: string }>;
  tools: { 
    byourougan: number; shintougan: number; tonpufu: number; 
    special1Name: string; special1Count: number;
    special2Name: string; special2Count: number;
    special3Name: string; special3Count: number;
  };
  
  // 🔥 오의 데이터 (3칸) 및 인법별 습득제한 (12칸) 추가
  ougi: Array<{ name: string; skill: string; effect: string; advantage: string; disadvantage: string; description: string; }>;
  ninpoLimits: Array<{ clan: string; limit: string; }>;

  background: string; memo: string; 
}

export const initialShinobigamiData: ShinobigamiData = {
  age: "", gender: "", pcNumber: "", clan: "", subClan: "", additionalHp: 0,
  style: "", meritPoints: 0, nemesis: "", belief: "", publicIdentity: "", rank: "중닌", specialty: "",
  mokryun: false, makyegonghak: false, gaps: [false, false, false, false, false, false],
  skills: {}, clanCondition: "", advantage: "", disadvantage: "",
  hp: { tech: true, body: true, nin: true, plot: true, tactics: true, magic: true },
  ninpo: [], 
  tools: { 
    byourougan: 0, shintougan: 0, tonpufu: 0,
    special1Name: "특수닌구", special1Count: 0,
    special2Name: "특수닌구", special2Count: 0,
    special3Name: "특수닌구", special3Count: 0
  }, 
  
  // 🔥 오의/습득제한 초기값 세팅
  ougi: Array.from({ length: 3 }, () => ({ name: "", skill: "", effect: "", advantage: "", disadvantage: "", description: "" })),
  ninpoLimits: Array.from({ length: 12 }, () => ({ clan: "", limit: "" })),
  
  background: "", memo: "",
};