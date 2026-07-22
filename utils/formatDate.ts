import type { Timestamp } from "firebase/firestore";

/**
 * Timestamp -> "2025년 7월 22일" 형태의 날짜 구분선 문자열
 */
export function formatDateDivider(ts: Timestamp | null): string {
  if (!ts) return "";
  const date = ts.toDate();
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

/**
 * Timestamp -> "14:32" 형태의 메시지 시각
 */
export function formatMessageTime(ts: Timestamp | null): string {
  if (!ts) return "전송 중";
  const date = ts.toDate();
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * 같은 날짜인지 비교 (날짜 구분선 삽입 여부 판단용)
 */
export function isSameDay(a: Timestamp | null, b: Timestamp | null): boolean {
  if (!a || !b) return false;
  const d1 = a.toDate();
  const d2 = b.toDate();
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
