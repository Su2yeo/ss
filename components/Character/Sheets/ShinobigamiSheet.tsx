"use client";

import { useState } from "react";
import type { ShinobigamiData } from "@/types/rules/shinobigami";

interface ShinobigamiSheetProps {
  sheetData: ShinobigamiData;
  onChange: (field: string, value: any) => void;
}

const CLANS = ["하스바 닌군", "쿠라마 신류", "하구레모노", "히라사카 기관", "사립 오토기학원", "오니의 혈통", "고류유파"];
const SUB_CLANS: Record<string, string[]> = {
  "하스바 닌군": ["상위", "츠바노미 조", "오오즈치 군", "사시가네 반", "오쿠기 무리", "켄반단"],
  "쿠라마 신류": ["상위", "마와리가라스", "바요넷", "마왕류", "연화왕권", "미츠쿠라 번"],
  "하구레모노": ["상위", "요루가오", "No.9", "세계닌자연합", "카게에자", "시라누이", "토가메류", "브레멘", "슈라우드", "독자유파"],
  "히라사카 기관": ["상위", "토쿄요", "시코메 무리", "공안은밀국", "쟈코카이 종합병원", "외사N과"],
  "사립 오토기학원": ["상위", "특교위", "학생회", "타라오여학원", "구교사관리위", "맥패든 탐정교실"],
  "오니의 혈통": ["상위", "츠치구모", "셰샤", "마가츠비", "나가미미", "엔마스지"],
  "고류유파": ["이가닌자", "코우가닌자", "우라야규", "네고로 무리", "슷파", "노키자루", "랏파", "톳파", "사이가 무리", "쿠로하바키 조", "자토우 무리", "하치야 무리", "야츠후사", "쿠로쿠와 조", "카와나미 무리", "야마쿠구리", "카루타 무리", "콘지키안", "스쿠나 무리", "신곤타치카와류", "츠치미카도 가문", "바테렌", "기케이류"],
};
const BELIEFS = ["흉", "율", "아", "정", "충", "화"];
const RANKS = ["하급닌자", "하닌 지휘관", "중급닌자", "중닌 지휘관", "상급닌자", "상닌 지휘관", "두령"];
const SPECIALTIES = ["기술", "체술", "인술", "모술", "전술", "요술"];

const SKILL_ROWS = [
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

export function ShinobigamiSheet({ sheetData, onChange }: ShinobigamiSheetProps) {
  const [activeSheetTab, setActiveSheetTab] = useState<string>("오의");
  const tabs = ["기본 정보", "특기", "인법 리스트", "닌구", "오의"];

  const handleClanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newClan = e.target.value;
    onChange("clan", newClan);
    if (SUB_CLANS[newClan] && SUB_CLANS[newClan].length > 0) onChange("subClan", SUB_CLANS[newClan][0]);
    else onChange("subClan", "");
  };

  const getSkill = (name: string) => sheetData.skills?.[name] || { isChecked: false, value: 24 };
  const updateSkill = (name: string, field: "isChecked" | "value", val: any) => {
    const current = getSkill(name);
    onChange("skills", { ...sheetData.skills, [name]: { ...current, [field]: val } });
  };

  const handleNinpoChange = (index: number, field: string, value: string) => {
    const currentNinpo = sheetData.ninpo || [];
    const newNinpo = [...currentNinpo];
    while (newNinpo.length < 12) newNinpo.push({ name: "", type: "", skill: "", range: "", cost: "", effect: "" });
    newNinpo[index] = { ...newNinpo[index], [field]: value };
    onChange("ninpo", newNinpo);
  };

  // 🔥 오의 헬퍼 함수
  const handleOugiChange = (index: number, field: string, value: string) => {
    const currentOugi = sheetData.ougi || [];
    const newOugi = [...currentOugi];
    while (newOugi.length < 3) newOugi.push({ name: "", skill: "", effect: "", advantage: "", disadvantage: "", description: "" });
    newOugi[index] = { ...newOugi[index], [field]: value };
    onChange("ougi", newOugi);
  };

  // 🔥 습득제한 헬퍼 함수
  const handleNinpoLimitChange = (index: number, field: string, value: string) => {
    const currentLimits = sheetData.ninpoLimits || [];
    const newLimits = [...currentLimits];
    while (newLimits.length < 12) newLimits.push({ clan: "", limit: "" });
    newLimits[index] = { ...newLimits[index], [field]: value };
    onChange("ninpoLimits", newLimits);
  };

  return (
    <div className="flex flex-col mt-4 bg-zinc-950 rounded-xl border border-zinc-800 flex-1 min-h-0 overflow-hidden">
      <div className="flex bg-zinc-900 border-b border-zinc-800 overflow-x-auto shrink-0 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSheetTab(tab)}
            className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition-colors ${activeSheetTab === tab ? "text-indigo-400 border-b-2 border-indigo-500 bg-zinc-800/50" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-zinc-950/50">
        
        {/* ================= 1. 기본 정보 탭 ================= */}
        {activeSheetTab === "기본 정보" && (
          <div className="flex flex-col gap-3">
             <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-[11px] text-zinc-400 mb-1">연령</label><input type="text" value={sheetData.age || ""} onChange={(e) => onChange("age", e.target.value)} className="w-full bg-zinc-900 text-sm p-2 rounded border border-zinc-700" /></div>
              <div><label className="block text-[11px] text-zinc-400 mb-1">성별</label><input type="text" value={sheetData.gender || ""} onChange={(e) => onChange("gender", e.target.value)} className="w-full bg-zinc-900 text-sm p-2 rounded border border-zinc-700" /></div>
              <div><label className="block text-[11px] text-zinc-400 mb-1">PC넘버</label><input type="text" value={sheetData.pcNumber || ""} onChange={(e) => onChange("pcNumber", e.target.value)} className="w-full bg-zinc-900 text-sm p-2 rounded border border-zinc-700" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-[11px] text-zinc-400 mb-1">유파</label><select value={sheetData.clan || ""} onChange={handleClanChange} className="w-full bg-zinc-900 text-sm p-2 rounded border border-zinc-700"><option value="" disabled>선택</option>{CLANS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="block text-[11px] text-zinc-400 mb-1">하위유파</label><select value={sheetData.subClan || ""} onChange={(e) => onChange("subClan", e.target.value)} className="w-full bg-zinc-900 text-sm p-2 rounded border border-zinc-700">{sheetData.clan && SUB_CLANS[sheetData.clan] ? SUB_CLANS[sheetData.clan].map(s => <option key={s} value={s}>{s}</option>) : <option value="" disabled>먼저 유파 선택</option>}</select></div>
              <div><label className="block text-[11px] text-zinc-400 mb-1">추가 생명력</label><input type="number" value={sheetData.additionalHp || 0} onChange={(e) => onChange("additionalHp", Number(e.target.value))} className="w-full bg-zinc-900 text-sm p-2 rounded border border-zinc-700 text-center" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><label className="block text-[11px] text-zinc-400 mb-1">법식</label><input type="text" value={sheetData.style || ""} onChange={(e) => onChange("style", e.target.value)} className="w-full bg-zinc-900 text-sm p-2 rounded border border-zinc-700" /></div>
              <div><label className="block text-[11px] text-zinc-400 mb-1">공적점</label><input type="number" value={sheetData.meritPoints || 0} onChange={(e) => onChange("meritPoints", Number(e.target.value))} className="w-full bg-zinc-900 text-sm p-2 rounded border border-zinc-700 text-center" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-[11px] text-zinc-400 mb-1">숙적</label><input type="text" value={sheetData.nemesis || ""} onChange={(e) => onChange("nemesis", e.target.value)} className="w-full bg-zinc-900 text-sm p-2 rounded border border-zinc-700" /></div>
              <div className="col-span-2"><label className="block text-[11px] text-zinc-400 mb-1">신념</label><select value={sheetData.belief || ""} onChange={(e) => onChange("belief", e.target.value)} className="w-full bg-zinc-900 text-sm p-2 rounded border border-zinc-700"><option value="" disabled>선택</option>{BELIEFS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-[11px] text-zinc-400 mb-1">대외적 신분</label><input type="text" value={sheetData.publicIdentity || ""} onChange={(e) => onChange("publicIdentity", e.target.value)} className="w-full bg-zinc-900 text-sm p-2 rounded border border-zinc-700" /></div>
              <div><label className="block text-[11px] text-zinc-400 mb-1">계급</label><select value={sheetData.rank || ""} onChange={(e) => onChange("rank", e.target.value)} className="w-full bg-zinc-900 text-sm p-2 rounded border border-zinc-700"><option value="" disabled>선택</option>{RANKS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div><label className="block text-[11px] text-zinc-400 mb-1">특기분야</label><select value={sheetData.specialty || ""} onChange={(e) => onChange("specialty", e.target.value)} className="w-full bg-zinc-900 text-sm p-2 rounded border border-zinc-700"><option value="" disabled>선택</option>{SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
          </div>
        )}

        {/* ================= 2. 특기 탭 ================= */}
        {activeSheetTab === "특기" && (
          <div className="w-full overflow-x-auto bg-white text-black p-2 rounded-lg border-2 border-zinc-700">
            <div className="flex justify-between items-center bg-black text-white px-3 py-1 font-bold rounded-t-sm">
              <label className="flex items-center gap-2 cursor-pointer"><span>목련</span><input type="checkbox" checked={sheetData.mokryun || false} onChange={(e) => onChange("mokryun", e.target.checked)} className="w-4 h-4" /></label>
              <span className="text-lg">특기</span>
              <label className="flex items-center gap-2 cursor-pointer"><span>마계공학</span><input type="checkbox" checked={sheetData.makyegonghak || false} onChange={(e) => onChange("makyegonghak", e.target.checked)} className="w-4 h-4" /></label>
            </div>
            <table className="w-full border-collapse text-center text-xs border-x-2 border-b-2 border-black">
              <thead>
                <tr className="bg-gray-500 text-white border-b border-black">
                  <th className="w-8 border-r border-black"></th>
                  {SPECIALTIES.map((col, i) => (
                    <th key={col} className="p-1.5 border-r border-black last:border-0 relative w-1/6 font-semibold">
                      <div className="flex justify-center items-center gap-2">
                        <span>{col}</span><input type="checkbox" checked={sheetData.gaps?.[i] || false} onChange={(e) => { const newGaps = [...(sheetData.gaps || [false,false,false,false,false,false])]; newGaps[i] = e.target.checked; onChange("gaps", newGaps); }} className="w-3.5 h-3.5 accent-zinc-800" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SKILL_ROWS.map((row, rowIndex) => (
                   <tr key={rowIndex} className="border-b border-gray-300">
                     <td className="bg-gray-700 text-white font-bold border-r border-black py-0.5">{rowIndex + 2}</td>
                     {row.map((skillName) => {
                        const skill = getSkill(skillName);
                        return (
                           <td key={skillName} className="p-0 border-r border-gray-300 last:border-0">
                              <div className="flex items-center justify-between px-1 h-[26px]">
                                 <input type="checkbox" checked={skill.isChecked} onChange={(e) => updateSkill(skillName, 'isChecked', e.target.checked)} className="w-3 h-3 cursor-pointer shrink-0" />
                                 <span className="truncate mx-1 flex-1 text-[11px] leading-none">{skillName}</span>
                                 <input type="number" value={skill.value} onChange={(e) => updateSkill(skillName, 'value', Number(e.target.value))} className="w-7 h-5 border border-gray-400 text-center text-[10px] bg-white text-black outline-none shrink-0 [&::-webkit-inner-spin-button]:appearance-none" />
                              </div>
                           </td>
                        )
                     })}
                   </tr>
                ))}
              </tbody>
            </table>
            <table className="w-full border-2 border-t-0 border-black border-collapse text-sm bg-white mt-[-2px]">
              <tbody>
                 <tr className="border-b border-black">
                    <th className="bg-white border-r border-black w-24 p-1 text-center font-bold text-sm">유파 조건</th>
                    <td className="p-1 bg-white"><input type="text" value={sheetData.clanCondition || ''} onChange={(e) => onChange("clanCondition", e.target.value)} className="w-full outline-none bg-transparent px-1 text-black" /></td>
                 </tr>
                 <tr className="border-b border-gray-300">
                    <th rowSpan={2} className="bg-white border-r border-black w-24 p-1 text-center font-bold text-sm">배경</th>
                    <th className="bg-white border-r border-black w-14 p-1 text-center text-xs font-semibold text-gray-700">장점</th>
                    <td className="p-1 bg-white"><input type="text" value={sheetData.advantage || ''} onChange={(e) => onChange("advantage", e.target.value)} className="w-full outline-none bg-transparent px-1 text-black" /></td>
                 </tr>
                 <tr className="border-b border-black">
                    <th className="bg-white border-r border-black w-14 p-1 text-center text-xs font-semibold text-gray-700">단점</th>
                    <td className="p-1 bg-white"><input type="text" value={sheetData.disadvantage || ''} onChange={(e) => onChange("disadvantage", e.target.value)} className="w-full outline-none bg-transparent px-1 text-black" /></td>
                 </tr>
                 <tr>
                    <th className="bg-white border-r border-black w-24 py-2 px-1 text-center font-bold text-sm leading-tight">설정<br/><span className="text-[10px] font-normal text-gray-600">(백스토리)</span></th>
                    <td colSpan={2} className="p-1 bg-white"><textarea value={sheetData.memo || ''} onChange={(e) => onChange("memo", e.target.value)} className="w-full h-16 outline-none bg-transparent resize-none px-1 text-sm text-black p-1"></textarea></td>
                 </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ================= 3. 인법 리스트 탭 ================= */}
        {activeSheetTab === "인법 리스트" && (
          <div className="w-full overflow-x-auto bg-white text-black p-2 rounded-lg border-2 border-zinc-700 min-w-[500px]">
             <div className="bg-black text-white px-3 py-1 font-bold rounded-t-sm text-center text-lg">인법 리스트</div>
             <table className="w-full border-collapse text-center text-xs border-x-2 border-b-2 border-black">
                <thead>
                   <tr className="bg-white border-b-2 border-black">
                      <th className="p-1.5 border-r border-black font-bold w-[18%]">인법명</th>
                      <th className="p-1.5 border-r border-black font-bold w-[12%]">타입</th>
                      <th className="p-1.5 border-r border-black font-bold w-[15%]">지정특기</th>
                      <th className="p-1.5 border-r border-black font-bold w-[10%]">간격</th>
                      <th className="p-1.5 border-r border-black font-bold w-[10%]">코스트</th>
                      <th className="p-1.5 font-bold">효과</th>
                   </tr>
                </thead>
                <tbody>
                   {Array.from({ length: 12 }).map((_, rowIndex) => {
                      const ninpo = sheetData.ninpo?.[rowIndex] || { name: "", type: "", skill: "", range: "", cost: "", effect: "" };
                      return (
                         <tr key={rowIndex} className="border-b border-gray-400 border-dashed last:border-solid last:border-black">
                            <td className="p-0 border-r border-black"><input type="text" value={ninpo.name} onChange={(e) => handleNinpoChange(rowIndex, "name", e.target.value)} className="w-full h-7 bg-transparent px-1 outline-none text-center font-semibold text-black" /></td>
                            <td className="p-0 border-r border-black relative">
                               <select value={ninpo.type} onChange={(e) => handleNinpoChange(rowIndex, "type", e.target.value)} className="w-full h-7 bg-transparent outline-none text-center text-black cursor-pointer px-1">
                                  <option value=""></option><option value="공격">공격</option><option value="서포트">서포트</option><option value="장비">장비</option>
                               </select>
                            </td>
                            <td className="p-0 border-r border-black"><input type="text" value={ninpo.skill} onChange={(e) => handleNinpoChange(rowIndex, "skill", e.target.value)} className="w-full h-7 bg-transparent px-1 outline-none text-center text-black" /></td>
                            <td className="p-0 border-r border-black"><input type="text" value={ninpo.range} onChange={(e) => handleNinpoChange(rowIndex, "range", e.target.value)} className="w-full h-7 bg-transparent px-1 outline-none text-center text-black" /></td>
                            <td className="p-0 border-r border-black"><input type="text" value={ninpo.cost} onChange={(e) => handleNinpoChange(rowIndex, "cost", e.target.value)} className="w-full h-7 bg-transparent px-1 outline-none text-center text-black" /></td>
                            <td className="p-0"><input type="text" value={ninpo.effect} onChange={(e) => handleNinpoChange(rowIndex, "effect", e.target.value)} className="w-full h-7 bg-transparent px-2 outline-none text-left text-black" /></td>
                         </tr>
                      );
                   })}
                </tbody>
             </table>
          </div>
        )}

        {/* ================= 4. 닌구 탭 ================= */}
        {activeSheetTab === "닌구" && (
          <div className="w-full max-w-sm mx-auto bg-white text-black border-2 border-black flex flex-col rounded-sm">
            <div className="bg-black text-white text-center py-2 font-bold text-2xl tracking-widest">닌구</div>
            <div className="bg-gray-400 text-black text-center py-1.5 font-semibold text-[13px] border-y-2 border-black">닌구는 최대 6개까지만 소지할 수 있다</div>
            <div className="flex flex-col">
              {[
                { key: "byourougan", label: "병량환", isFixed: true },
                { key: "shintougan", label: "신통환", isFixed: true },
                { key: "tonpufu", label: "둔갑부", isFixed: true },
                { key: "special1", label: "특수닌구", isFixed: false },
                { key: "special2", label: "특수닌구", isFixed: false },
                { key: "special3", label: "특수닌구", isFixed: false },
              ].map((item, idx) => (
                <div key={idx} className="flex border-b border-gray-300 last:border-b-0 h-11">
                  <div className="w-[45%] bg-zinc-600 flex items-center justify-center border-r border-zinc-400 border-dashed">
                    {item.isFixed ? (
                      <span className="text-white font-bold text-sm tracking-wide">{item.label}</span>
                    ) : (
                      <input 
                        type="text" 
                        /* 🔥 (sheetData.tools as any) 로 타입 에러 해결 */
                        value={(sheetData.tools as any)?.[`${item.key}Name`] ?? item.label} 
                        onChange={(e) => onChange("tools", { ...(sheetData.tools || {}), [`${item.key}Name`]: e.target.value })} 
                        placeholder="특수닌구" 
                        className="w-full bg-transparent text-center text-white font-bold text-sm tracking-wide outline-none placeholder-white/70" 
                      />
                    )}
                  </div>
                  <div className="w-[55%] flex items-center justify-center bg-zinc-100">
                    <input 
                      type="number" min="0" max="6" 
                      /* 🔥 여기도 (sheetData.tools as any) 적용 */
                      value={(sheetData.tools as any)?.[item.isFixed ? item.key : `${item.key}Count`] || 0} 
                      onChange={(e) => onChange("tools", { ...(sheetData.tools || {}), [item.isFixed ? item.key : `${item.key}Count`]: Number(e.target.value) })} 
                      className="w-full h-full bg-transparent text-center text-black font-semibold text-base outline-none" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 5. 오의 탭 ================= */}
        {activeSheetTab === "오의" && (
          <div className="w-full overflow-x-auto bg-white text-black border-2 border-black flex flex-col rounded-sm min-w-[500px]">
            {/* 타이틀 */}
            <div className="bg-black text-white text-center py-2 font-bold text-2xl tracking-widest border-b-2 border-black">
              오의
            </div>

            {/* 🔥 3개의 오의 블록 */}
            {Array.from({ length: 3 }).map((_, idx) => {
              const ougi = sheetData.ougi?.[idx] || { name: "", skill: "", effect: "", advantage: "", disadvantage: "", description: "" };
              return (
                <div key={idx} className="flex flex-col border-b-2 border-black last:border-b-0 text-sm">
                  {/* Row 1, 2, 3 */}
                  <div className="flex border-b border-gray-400 border-dashed">
                    <div className="w-28 bg-zinc-600 text-white font-bold text-center py-1 border-r border-gray-400">오의명</div>
                    <input type="text" className="flex-1 px-2 outline-none bg-transparent" value={ougi.name} onChange={(e) => handleOugiChange(idx, 'name', e.target.value)} />
                  </div>
                  <div className="flex border-b border-gray-400 border-dashed">
                    <div className="w-28 bg-zinc-600 text-white font-bold text-center py-1 border-r border-gray-400">지정특기</div>
                    <input type="text" className="flex-1 px-2 outline-none bg-transparent" value={ougi.skill} onChange={(e) => handleOugiChange(idx, 'skill', e.target.value)} />
                  </div>
                  <div className="flex border-b border-gray-400">
                    <div className="w-28 bg-zinc-600 text-white font-bold text-center py-1 border-r border-gray-400">효과</div>
                    <input type="text" className="flex-1 px-2 outline-none bg-transparent" value={ougi.effect} onChange={(e) => handleOugiChange(idx, 'effect', e.target.value)} />
                  </div>
                  
                  {/* Row 4 (강점/약점) */}
                  <div className="flex border-b border-gray-400">
                    <div className="w-16 bg-zinc-600 text-white font-bold text-center py-1 border-r border-gray-400">강점</div>
                    <input type="text" className="flex-1 px-2 outline-none bg-transparent border-r border-gray-400" value={ougi.advantage} onChange={(e) => handleOugiChange(idx, 'advantage', e.target.value)} />
                    <div className="w-16 bg-zinc-600 text-white font-bold text-center py-1 border-r border-gray-400">약점</div>
                    <input type="text" className="flex-1 px-2 outline-none bg-transparent" value={ougi.disadvantage} onChange={(e) => handleOugiChange(idx, 'disadvantage', e.target.value)} />
                  </div>
                  
                  {/* Row 5 (설명) */}
                  <div className="flex bg-gray-100 min-h-[90px]">
                    <div className="w-28 bg-zinc-600 text-white font-bold text-center flex items-center justify-center border-r border-gray-400 p-2">설명</div>
                    <textarea className="flex-1 p-2 outline-none resize-none bg-transparent" value={ougi.description} onChange={(e) => handleOugiChange(idx, 'description', e.target.value)} />
                  </div>
                </div>
              )
            })}

            {/* 🔥 인법별 습득제한 모음 */}
            <div className="bg-zinc-600 text-white text-center py-2 font-bold text-lg tracking-widest border-y-2 border-black">
              인법별 습득제한 모음
            </div>
            
            <div className="flex bg-gray-300 font-bold border-b-2 border-black text-center text-sm">
              <div className="w-8 border-r border-gray-400"></div>
              <div className="flex-1 py-1 border-r border-gray-400">유파</div>
              <div className="flex-1 py-1 border-r border-gray-400">제한</div>
              <div className="w-8 border-r border-gray-400"></div>
              <div className="flex-1 py-1 border-r border-gray-400">유파</div>
              <div className="flex-1 py-1">제한</div>
            </div>
            
            {/* 6열 렌더링 (1~6 / 7~12) */}
            <div className="flex flex-col text-sm bg-white">
              {Array.from({length: 6}).map((_, i) => {
                const limit1 = sheetData.ninpoLimits?.[i] || { clan: "", limit: "" };
                const limit2 = sheetData.ninpoLimits?.[i + 6] || { clan: "", limit: "" };
                return (
                  <div key={i} className="flex border-b border-gray-400 border-dashed last:border-b-0 text-center">
                    <div className="w-8 bg-gray-300 text-black font-bold py-1 border-r border-gray-500">{i + 1}</div>
                    <input type="text" className="flex-1 px-1 outline-none border-r border-gray-400 bg-transparent text-center" value={limit1.clan} onChange={(e) => handleNinpoLimitChange(i, 'clan', e.target.value)} />
                    <input type="text" className="flex-1 px-1 outline-none border-r border-gray-400 bg-transparent text-center" value={limit1.limit} onChange={(e) => handleNinpoLimitChange(i, 'limit', e.target.value)} />
                    
                    <div className="w-8 bg-gray-300 text-black font-bold py-1 border-r border-gray-500">{i + 7}</div>
                    <input type="text" className="flex-1 px-1 outline-none border-r border-gray-400 bg-transparent text-center" value={limit2.clan} onChange={(e) => handleNinpoLimitChange(i + 6, 'clan', e.target.value)} />
                    <input type="text" className="flex-1 px-1 outline-none bg-transparent text-center" value={limit2.limit} onChange={(e) => handleNinpoLimitChange(i + 6, 'limit', e.target.value)} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}