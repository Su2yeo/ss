export const rollDice = (formula: string) => {
  // 띄어쓰기 제거 및 소문자화
  const cleanFormula = formula.toLowerCase().replace(/\s/g, "");
  
  // '숫자 d 숫자 + 숫자' 패턴 매칭
  const match = cleanFormula.match(/(\d+)d(\d+)(?:\+(\d+))?/);
  
  if (!match) return null; 

  const count = parseInt(match[1], 10) || 1;
  const sides = parseInt(match[2], 10);
  const bonus = parseInt(match[3], 10) || 0;

  // 과도한 숫자 방지 (안전장치)
  if (count > 100 || sides > 1000) return null; 

  const rolls: number[] = [];
  let total = 0;

  for (let i = 0; i < count; i++) {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    total += roll;
  }

  total += bonus;

  return { formula, rolls, total };
};