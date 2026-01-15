import type { Board } from "../types";
import { COLS, ROWS } from "../constants";

// 라인 클리어 처리
export function clearLines(board: Board) {
  let lines = 0;
  const newBoard = board.map((row) => [...row]);

  for (let row = ROWS - 1; row >= 0; row--) {
    if (newBoard[row].every((cell) => cell !== 0)) {
      newBoard.splice(row, 1);
      newBoard.unshift(Array(COLS).fill(0));
      lines++;
      row++;
    }
  }
  return { board: newBoard, lines };
}

// 클리어한 줄 수와 레벨에 따른 점수
export function getLineScore(lines: number, level: number) {
  if (lines <= 0) return 0;

  const base = [0, 100, 300, 500, 800][lines] ?? 0;
  return base * level;
}
