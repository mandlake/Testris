/**
 * src/logic/utils/collision.ts
 * 유틸 함수
 */
import type { Board, Piece, Shape } from "../types";
import { COLS, ROWS } from "../constants";

// 블록 충돌 여부 판단
export function collide(
  board: Board,
  piece: Piece,
  offsetX: number,
  offsetY: number,
  shape: Shape = piece.shape
): boolean {
  const xPos = piece.x + offsetX;
  const yPos = piece.y + offsetY;

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;

      const newX = xPos + x;
      const newY = yPos + y;

      if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
      if (newY < 0) continue;

      if (board[newY][newX]) return true;
    }
  }
  return false;
}
