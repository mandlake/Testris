/**
 * src/logic/utils/board.ts
 * 유틸 함수
 */

import type { Board } from "../types";
import { ROWS, COLS } from "../constants";

// 빈 보드 생성
export function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}
