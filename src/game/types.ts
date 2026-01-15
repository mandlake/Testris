/**
 * src/game/types.ts
 * 타입 정의
 */

export type Cell = number;
export type Board = Cell[][];
export type Shape = number[][];

export interface Piece {
  shape: Shape; // N x N 모양
  x: number;
  y: number;
  type: number; // 블록 타입 (색상 구분용)
}

export interface PieceProto {
  type: number;
  shape: Shape;
}
