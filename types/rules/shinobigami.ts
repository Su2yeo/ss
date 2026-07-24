export interface ShinobigamiData {
  age: string; gender: string; pcNumber: string; clan: string; subClan: string;
  additionalHp: number; style: string; meritPoints: number; nemesis: string; belief: string;
  publicIdentity: string; rank: string; specialty: string;

  mokryun: boolean; makyegonghak: boolean; gaps: boolean[]; lostFields: boolean[];
  skills: Record<string, { isChecked: boolean; value: number }>;
  
  clanCondition: string; 
  advantageTitle: string; // 🔥 추가됨
  advantage: string; 
  disadvantageTitle: string; // 🔥 추가됨
  disadvantage: string;

  hp: { tech: boolean; body: boolean; nin: boolean; plot: boolean; tactics: boolean; magic: boolean; };
  ninpo: Array<{ name: string; type: string; skill: string; range: string; cost: string; effect: string }>;
  tools: { 
    byourougan: number; shintougan: number; tonpufu: number; 
    special1Name: string; special1Count: number;
    special2Name: string; special2Count: number;
    special3Name: string; special3Count: number;
  };
  
  ougi: Array<{ name: string; skill: string; effect: string; advantage: string; disadvantage: string; description: string; }>;
  ninpoLimits: Array<{ clan: string; limit: string; }>;

  background: string; memo: string; 
}

export const initialShinobigamiData: ShinobigamiData = {
  age: "", gender: "", pcNumber: "", clan: "", subClan: "", additionalHp: 0,
  style: "", meritPoints: 0, nemesis: "", belief: "", publicIdentity: "", rank: "중닌", specialty: "",
  mokryun: false, makyegonghak: false, gaps: [false, false, false, false, false, false], lostFields: [false, false, false, false, false, false],
  // 🔥 초기값에도 advantageTitle과 disadvantageTitle을 빈 문자열로 추가해 줍니다.
  skills: {}, clanCondition: "", advantageTitle: "", advantage: "", disadvantageTitle: "", disadvantage: "",
  hp: { tech: true, body: true, nin: true, plot: true, tactics: true, magic: true },
  ninpo: [], 
  tools: { 
    byourougan: 0, shintougan: 0, tonpufu: 0,
    special1Name: "특수닌구", special1Count: 0,
    special2Name: "특수닌구", special2Count: 0,
    special3Name: "특수닌구", special3Count: 0
  }, 
  ougi: Array.from({ length: 3 }, () => ({ name: "", skill: "", effect: "", advantage: "", disadvantage: "", description: "" })),
  ninpoLimits: Array.from({ length: 12 }, () => ({ clan: "", limit: "" })),
  background: "", memo: "",
};

// 🔥 컴포넌트에서 분리해 온 시노비가미 룰 고정 데이터
export const CLANS = ["하스바 닌군", "쿠라마 신류", "하구레모노", "히라사카 기관", "사립 오토기학원", "오니의 혈통", "고류유파"];
export const SUB_CLANS: Record<string, string[]> = {
  "하스바 닌군": ["상위", "츠바노미 조", "오오즈치 군", "사시가네 반", "오쿠기 무리", "켄반단"],
  "쿠라마 신류": ["상위", "마와리가라스", "바요넷", "마왕류", "연화왕권", "미츠쿠라 번"],
  "하구레모노": ["상위", "요루가오", "No.9", "세계닌자연합", "카게에자", "시라누이", "토가메류", "브레멘", "슈라우드", "독자유파"],
  "히라사카 기관": ["상위", "토쿄요", "시코메 무리", "공안은밀국", "쟈코카이 종합병원", "외사N과"],
  "사립 오토기학원": ["상위", "특교위", "학생회", "타라오여학원", "구교사관리위", "맥패든 탐정교실"],
  "오니의 혈통": ["상위", "츠치구모", "셰샤", "마가츠비", "나가미미", "엔마스지"],
  "고류유파": ["이가닌자", "코우가닌자", "우라야규", "네고로 무리", "슷파", "노키자루", "랏파", "톳파", "사이가 무리", "쿠로하바키 조", "자토우 무리", "하치야 무리", "야츠후사", "쿠로쿠와 조", "카와나미 무리", "야마쿠구리", "카루타 무리", "콘지키안", "스쿠나 무리", "신곤타치카와류", "츠치미카도 가문", "바테렌", "기케이류"],
};
export const BELIEFS = ["흉", "율", "아", "정", "충", "화"];
export const RANKS = ["하급닌자", "하닌 지휘관", "중급닌자", "중닌 지휘관", "상급닌자", "상닌 지휘관", "두령"];
export const SPECIALTIES = ["기술", "체술", "인술", "모술", "전술", "요술"];
export const SKILL_ROWS = [
  ["기계조작", "기승술", "생존술", "의술", "병량술", "이형화"],
  ["불의 술", "포술", "잠복술", "독술", "조련술", "소환술"],
  ["물의 술", "수리검술", "도주술", "함정술", "야전술", "사령술"],
  ["침술", "손놀림", "도청술", "조사술", "지형활용", "결계술"],
  ["격납술", "신체조작", "복화술", "사기술", "의기", "봉인술"],
  ["의상술", "보법", "은신술", "대인술", "용병술", "언령술"],
  ["포승술", "주법", "변장술", "예능", "기억술", "환술"],
  ["등반술", "비행술", "조향술", "미인계", "견적술", "동술"],
  ["고문술", "격투술", "분신술", "꼭두각시술", "암호술", "천리안"],
  ["장치파괴술", "검술", "은폐술", "선동술", "전달술", "빙의술"],
  ["굴착술", "괴력", "제6감", "경제력", "인맥", "저주술"]
];