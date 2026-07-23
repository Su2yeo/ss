"use client";

import React, { useState, useMemo } from "react";
import type { ShinobigamiData } from "@/types/rules/shinobigami";
import { CLANS, SUB_CLANS, BELIEFS, RANKS, SPECIALTIES, SKILL_ROWS } from "@/types/rules/shinobigami";
import type { Character } from "@/types/character";
import { useChatMessages } from "@/hooks/useChatMessages"; // 🔥 채팅 훅 불러오기

// 🔥 roomId와 character를 부모로부터 전달받습니다.
interface ShinobigamiSheetProps {
  roomId: string;
  character: Character;
  sheetData: ShinobigamiData;
  onChange: (field: string, value: any) => void;
}

export function ShinobigamiSheet({ roomId, character, sheetData, onChange }: ShinobigamiSheetProps) {
  const [activeSheetTab, setActiveSheetTab] = useState<string>("기본 정보");
  const tabs = ["기본 정보", "특기", "인법 리스트", "닌구", "오의"];

  // 🔥 채팅 전송 함수 가져오기
  const { sendMessage } = useChatMessages(roomId);

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

  // 🔥 특기 목표값(판정 수치) 자동 계산
  const targetValues = useMemo(() => {
    const rows = SKILL_ROWS.length;
    const cols = SKILL_ROWS[0].length;
    
    const lostFields = sheetData.lostFields || Array(6).fill(false);
    const specIndex = SPECIALTIES.indexOf(sheetData.specialty);
    const isSpecialty = Array(6).fill(false);
    if (specIndex !== -1) isSpecialty[specIndex] = true;

    const grid: number[][] = SKILL_ROWS.map((row) =>
      row.map((name, c) => {
        if (lostFields[c]) return 99; 
        return getSkill(name).isChecked ? 5 : 20;
      })
    );

    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const current = grid[r][c];
          if (current >= 12) continue;

          if (r > 0 && grid[r - 1][c] > current + 1) { grid[r - 1][c] = current + 1; changed = true; }
          if (r < rows - 1 && grid[r + 1][c] > current + 1) { grid[r + 1][c] = current + 1; changed = true; }

          if (sheetData.mokryun) {
            if (r === 0 && grid[10][c] > current + 1) { grid[10][c] = current + 1; changed = true; }
            if (r === 10 && grid[0][c] > current + 1) { grid[0][c] = current + 1; changed = true; }
          }

          if (c > 0 && !lostFields[c - 1]) {
            const gapFilled = isSpecialty[c - 1] || isSpecialty[c];
            const cost = gapFilled ? 1 : 2;
            if (grid[r][c - 1] > current + cost) { grid[r][c - 1] = current + cost; changed = true; }
          }
          if (c < cols - 1 && !lostFields[c + 1]) {
            const gapFilled = isSpecialty[c] || isSpecialty[c + 1];
            const cost = gapFilled ? 1 : 2;
            if (grid[r][c + 1] > current + cost) { grid[r][c + 1] = current + cost; changed = true; }
          }

          if (sheetData.makyegonghak) {
            const leftGapFilled = isSpecialty[0];
            const cost = leftGapFilled ? 1 : 2;
            if (c === 0 && !lostFields[5] && grid[r][5] > current + cost) { grid[r][5] = current + cost; changed = true; }
            if (c === 5 && !lostFields[0] && grid[r][0] > current + cost) { grid[r][0] = current + cost; changed = true; }
          }
        }
      }
    }

    const map: Record<string, number> = {};
    SKILL_ROWS.forEach((row, r) => {
      row.forEach((name, c) => {
        map[name] = lostFields[c] ? 12 : Math.min(grid[r][c], 12);
      });
    });
    return map;
  }, [sheetData.skills, sheetData.specialty, sheetData.mokryun, sheetData.makyegonghak, sheetData.lostFields]);

  const [rollResult, setRollResult] = useState<{
    skillName: string;
    target: number;
    dice: [number, number];
    total: number;
    success: boolean;
  } | null>(null);

  // 🔥 주사위 굴림 핸들러: 시트 내부 화면에 띄우고, 채팅방으로도 전송합니다.
  const handleSkillRoll = async (skillName: string) => {
    const target = targetValues[skillName] ?? 12;
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;
    const success = total >= target;
    
    // 1. 시트 내부 결과 배너 표시
    setRollResult({ skillName, target, dice: [d1, d2], total, success });

    // 2. 채팅창으로 주사위 결과 전송 (본편 탭)
    const formulaStr = `2d6>=${target} (${skillName})`;
    const contentMessage = `「${skillName}」 판정 (목표값: ${target})`;
    
    try {
      await sendMessage({
        type: "dice",
        authorId: character.ownerId, 
        authorName: character.name,
        authorPhotoURL: character.avatarUrl,
        content: contentMessage,
        category: "main", // 특기 판정이므로 '본편' 채팅으로 전송
        diceResult: {
          formula: formulaStr,
          rolls: [d1, d2],
          total: total
        }
      });
    } catch (err) {
      console.error("주사위 결과 전송 실패:", err);
    }
  };

  const handleNinpoChange = (index: number, field: string, value: string) => {
    const currentNinpo = sheetData.ninpo || [];
    const newNinpo = [...currentNinpo];
    while (newNinpo.length < 12) newNinpo.push({ name: "", type: "", skill: "", range: "", cost: "", effect: "" });
    newNinpo[index] = { ...newNinpo[index], [field]: value };
    onChange("ninpo", newNinpo);
  };

  const handleOugiChange = (index: number, field: string, value: string) => {
    const currentOugi = sheetData.ougi || [];
    const newOugi = [...currentOugi];
    while (newOugi.length < 3) newOugi.push({ name: "", skill: "", effect: "", advantage: "", disadvantage: "", description: "" });
    newOugi[index] = { ...newOugi[index], [field]: value };
    onChange("ougi", newOugi);
  };

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
              <div><label className="block text-[11px] text-zinc-400 mb-1">연령</label><input type="text" value={sheetData.age || ""} onChange={(e) => onChange("age", e.target.value)} className="w-full bg-zinc-900 text-white text-sm p-2 rounded border border-zinc-700" /></div>
              <div><label className="block text-[11px] text-zinc-400 mb-1">성별</label><input type="text" value={sheetData.gender || ""} onChange={(e) => onChange("gender", e.target.value)} className="w-full bg-zinc-900 text-white text-sm p-2 rounded border border-zinc-700" /></div>
              <div><label className="block text-[11px] text-zinc-400 mb-1">PC넘버</label><input type="text" value={sheetData.pcNumber || ""} onChange={(e) => onChange("pcNumber", e.target.value)} className="w-full bg-zinc-900 text-white text-sm p-2 rounded border border-zinc-700" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-[11px] text-zinc-400 mb-1">유파</label><select value={sheetData.clan || ""} onChange={handleClanChange} className="w-full bg-zinc-900 text-white text-sm p-2 rounded border border-zinc-700 cursor-pointer"><option value="" disabled className="bg-zinc-900 text-zinc-400">선택</option>{CLANS.map(c => <option key={c} value={c} className="bg-zinc-900 text-white">{c}</option>)}</select></div>
              <div><label className="block text-[11px] text-zinc-400 mb-1">하위유파</label><select value={sheetData.subClan || ""} onChange={(e) => onChange("subClan", e.target.value)} className="w-full bg-zinc-900 text-white text-sm p-2 rounded border border-zinc-700 cursor-pointer">{sheetData.clan && SUB_CLANS[sheetData.clan] ? SUB_CLANS[sheetData.clan].map(s => <option key={s} value={s} className="bg-zinc-900 text-white">{s}</option>) : <option value="" disabled className="bg-zinc-900 text-zinc-400">먼저 유파 선택</option>}</select></div>
              <div><label className="block text-[11px] text-zinc-400 mb-1">추가 생명력</label><input type="number" value={sheetData.additionalHp || 0} onChange={(e) => onChange("additionalHp", Number(e.target.value))} className="w-full bg-zinc-900 text-white text-sm p-2 rounded border border-zinc-700 text-center" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><label className="block text-[11px] text-zinc-400 mb-1">법식</label><input type="text" value={sheetData.style || ""} onChange={(e) => onChange("style", e.target.value)} className="w-full bg-zinc-900 text-white text-sm p-2 rounded border border-zinc-700" /></div>
              <div><label className="block text-[11px] text-zinc-400 mb-1">공적점</label><input type="number" value={sheetData.meritPoints || 0} onChange={(e) => onChange("meritPoints", Number(e.target.value))} className="w-full bg-zinc-900 text-white text-sm p-2 rounded border border-zinc-700 text-center" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-[11px] text-zinc-400 mb-1">숙적</label><input type="text" value={sheetData.nemesis || ""} onChange={(e) => onChange("nemesis", e.target.value)} className="w-full bg-zinc-900 text-white text-sm p-2 rounded border border-zinc-700" /></div>
              <div className="col-span-2"><label className="block text-[11px] text-zinc-400 mb-1">신념</label><select value={sheetData.belief || ""} onChange={(e) => onChange("belief", e.target.value)} className="w-full bg-zinc-900 text-white text-sm p-2 rounded border border-zinc-700 cursor-pointer"><option value="" disabled className="bg-zinc-900 text-zinc-400">선택</option>{BELIEFS.map(b => <option key={b} value={b} className="bg-zinc-900 text-white">{b}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-[11px] text-zinc-400 mb-1">대외적 신분</label><input type="text" value={sheetData.publicIdentity || ""} onChange={(e) => onChange("publicIdentity", e.target.value)} className="w-full bg-zinc-900 text-white text-sm p-2 rounded border border-zinc-700" /></div>
              <div><label className="block text-[11px] text-zinc-400 mb-1">계급</label><select value={sheetData.rank || ""} onChange={(e) => onChange("rank", e.target.value)} className="w-full bg-zinc-900 text-white text-sm p-2 rounded border border-zinc-700 cursor-pointer"><option value="" disabled className="bg-zinc-900 text-zinc-400">선택</option>{RANKS.map(r => <option key={r} value={r} className="bg-zinc-900 text-white">{r}</option>)}</select></div>
              <div><label className="block text-[11px] text-zinc-400 mb-1">특기분야</label><select value={sheetData.specialty || ""} onChange={(e) => onChange("specialty", e.target.value)} className="w-full bg-zinc-900 text-white text-sm p-2 rounded border border-zinc-700 cursor-pointer"><option value="" disabled className="bg-zinc-900 text-zinc-400">선택</option>{SPECIALTIES.map(s => <option key={s} value={s} className="bg-zinc-900 text-white">{s}</option>)}</select></div>
            </div>
          </div>
        )}

        {/* ================= 2. 특기 탭 ================= */}
        {activeSheetTab === "특기" && (
          <div className="w-full overflow-x-auto bg-white text-black p-2 rounded-lg border-2 border-zinc-700 relative">
            <div className="flex justify-between items-center bg-black text-white px-3 py-1 font-bold rounded-t-sm">
              <label className="flex items-center gap-2 cursor-pointer"><span>목련</span><input type="checkbox" checked={sheetData.mokryun || false} onChange={(e) => onChange("mokryun", e.target.checked)} className="w-4 h-4" /></label>
              <span className="text-lg">특기</span>
              <label className="flex items-center gap-2 cursor-pointer"><span>마계공학</span><input type="checkbox" checked={sheetData.makyegonghak || false} onChange={(e) => onChange("makyegonghak", e.target.checked)} className="w-4 h-4" /></label>
            </div>

            {rollResult && (
              <div className={`flex items-center justify-between px-3 py-2 text-sm font-bold border-x-2 ${rollResult.success ? "bg-emerald-100 text-emerald-800 border-emerald-400" : "bg-rose-100 text-rose-800 border-rose-400"}`}>
                <span>
                  「{rollResult.skillName}」 판정 : {rollResult.dice[0]} + {rollResult.dice[1]} = {rollResult.total} (목표 {rollResult.target}) → {rollResult.success ? "성공" : "실패"}
                </span>
                <button type="button" onClick={() => setRollResult(null)} className="text-xs opacity-60 hover:opacity-100 ml-2 px-1">✕</button>
              </div>
            )}

            <table className="w-full border-collapse text-center text-xs border-x-2 border-black">
              <thead>
                <tr className="bg-gray-500 text-white border-b border-black">
                  <th className="w-8 border-r border-black"></th>
                  <th className="p-0 bg-gray-700 border-r border-black">
                    <div className="w-[14px] min-w-[14px]"></div>
                  </th>
                  
                  {SPECIALTIES.map((col, i) => (
                    <React.Fragment key={col}>
                      <th className="p-1 border-r border-black relative w-1/6 font-semibold">
                        <div className="flex flex-col items-center gap-1">
                          <label className={`flex items-center gap-1 text-[10px] px-1 rounded cursor-pointer transition-colors ${sheetData.lostFields?.[i] ? 'bg-red-800 text-white' : 'bg-gray-600 text-gray-300'}`}>
                            <span>소실</span>
                            <input 
                              type="checkbox" 
                              checked={sheetData.lostFields?.[i] || false} 
                              onChange={(e) => {
                                const newLost = [...(sheetData.lostFields || [false,false,false,false,false,false])];
                                newLost[i] = e.target.checked;
                                onChange("lostFields", newLost);
                              }}
                              className="w-2.5 h-2.5 accent-red-500 cursor-pointer"
                            />
                          </label>
                          <div className="mt-0.5 text-[12px]">{col}</div>
                        </div>
                      </th>
                      {i < 5 && (
                        <th className="p-0 bg-gray-700 border-r border-black">
                          <div className="w-[14px] min-w-[14px]"></div>
                        </th>
                      )}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SKILL_ROWS.map((row, rowIndex) => (
                   <tr key={rowIndex} className="border-b border-gray-300">
                     <td className="bg-gray-700 text-white font-bold border-r border-black py-0.5">{rowIndex + 2}</td>
                     
                     <td className={`p-0 border-r border-black transition-colors duration-200 ${sheetData.specialty === '기술' ? 'bg-[#222] border-[#222]' : 'bg-white border-gray-300 border-dashed'}`}>
                       <div className="w-[14px] min-w-[14px] h-[26px]"></div>
                     </td>

                     {row.map((skillName, colIndex) => {
                        const skill = getSkill(skillName);
                        const isLost = sheetData.lostFields?.[colIndex] || false;
                        
                        const specIndex = SPECIALTIES.indexOf(sheetData.specialty);
                        const gapFilled = specIndex === colIndex || specIndex === colIndex + 1;
                        
                        return (
                           <React.Fragment key={skillName}>
                             <td className="p-0 border-r border-gray-300">
                                <div className="flex items-center px-1 h-[26px]">
                                   <input type="checkbox" checked={skill.isChecked} onChange={(e) => updateSkill(skillName, 'isChecked', e.target.checked)} className="w-3 h-3 cursor-pointer shrink-0" />
                                   
                                   <button
                                     type="button"
                                     onClick={() => handleSkillRoll(skillName)}
                                     className={`truncate mx-1 flex-1 text-[11px] leading-none text-center cursor-pointer ${isLost ? "text-gray-400" : "text-black hover:underline hover:text-indigo-700"}`}
                                   >
                                     {skillName}
                                   </button>
                                   
                                   <span className={`w-5 h-5 flex items-center justify-end text-[11px] font-bold shrink-0 pr-1 ${isLost ? "text-gray-400" : skill.isChecked ? "text-indigo-700" : "text-gray-500"}`}>
                                     {targetValues[skillName] ?? 12}
                                   </span>
                                </div>
                             </td>
                             
                             {colIndex < 5 && (
                               <td className={`p-0 border-r border-black transition-colors duration-200 ${gapFilled ? 'bg-[#222] border-[#222]' : 'bg-white border-gray-300 border-dashed'}`}>
                                 <div className="w-[14px] min-w-[14px] h-[26px]"></div>
                               </td>
                             )}
                           </React.Fragment>
                        )
                     })}
                   </tr>
                ))}
              </tbody>
            </table>
            
            <div className="flex justify-end items-center bg-black text-white p-1.5 border-x-2 border-b-2 border-black border-t">
               <span className="text-xs font-bold mr-2">전문 분야</span>
               <select 
                 value={sheetData.specialty || ""}
                 onChange={(e) => onChange("specialty", e.target.value)}
                 className="bg-white text-black text-xs font-bold px-2 py-0.5 outline-none rounded-sm cursor-pointer"
               >
                 <option value="" disabled>선택</option>
                 {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>
            
            <table className="w-full border-2 border-t-0 border-black border-collapse text-sm bg-white">
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
            <div className="bg-black text-white text-center py-2 font-bold text-2xl tracking-widest border-b-2 border-black">
              오의
            </div>

            {Array.from({ length: 3 }).map((_, idx) => {
              const ougi = sheetData.ougi?.[idx] || { name: "", skill: "", effect: "", advantage: "", disadvantage: "", description: "" };
              return (
                <div key={idx} className="flex flex-col border-b-2 border-black last:border-b-0 text-sm">
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
                  
                  <div className="flex border-b border-gray-400">
                    <div className="w-16 bg-zinc-600 text-white font-bold text-center py-1 border-r border-gray-400">강점</div>
                    <input type="text" className="flex-1 px-2 outline-none bg-transparent border-r border-gray-400" value={ougi.advantage} onChange={(e) => handleOugiChange(idx, 'advantage', e.target.value)} />
                    <div className="w-16 bg-zinc-600 text-white font-bold text-center py-1 border-r border-gray-400">약점</div>
                    <input type="text" className="flex-1 px-2 outline-none bg-transparent" value={ougi.disadvantage} onChange={(e) => handleOugiChange(idx, 'disadvantage', e.target.value)} />
                  </div>
                  
                  <div className="flex bg-gray-100 min-h-[90px]">
                    <div className="w-28 bg-zinc-600 text-white font-bold text-center flex items-center justify-center border-r border-gray-400 p-2">설명</div>
                    <textarea className="flex-1 p-2 outline-none resize-none bg-transparent" value={ougi.description} onChange={(e) => handleOugiChange(idx, 'description', e.target.value)} />
                  </div>
                </div>
              )
            })}

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