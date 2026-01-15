/**
 * src/types/export constants.ts
 * =========================
 * 설정값 (여기만 바꾸면 됨)
 * =========================
 */

// 보드 크기
export const COLS = 14;
export const ROWS = 25;

// 이번 판에서 사용할 블록 종류 개수 (타입 개수)
export const SHAPE_TYPE_COUNT = 10;

// 블록 모양의 한 변 길이 N의 최소/최대 (N x N)
export const MIN_SHAPE_SIZE = 3;
export const MAX_SHAPE_SIZE = 4;

// 한 블록 안에 채워질 최소/최대 칸 수
export const MIN_BLOCKS_PER_SHAPE = 3;
export const MAX_BLOCKS_PER_SHAPE = 7;

// TGM 느낌의 레벨별 속도 테이블 (ms 단위)
export const SPEED_TABLE: { level: number; speed: number }[] = [
  { level: 1, speed: 800 },
  { level: 2, speed: 700 },
  { level: 3, speed: 600 },
  { level: 4, speed: 500 },
  { level: 5, speed: 430 },
  { level: 6, speed: 380 },
  { level: 7, speed: 340 },
  { level: 8, speed: 300 },
  { level: 9, speed: 260 },
  { level: 10, speed: 230 },
  { level: 11, speed: 200 },
  { level: 12, speed: 180 },
  { level: 13, speed: 160 },
  { level: 14, speed: 140 },
  { level: 15, speed: 120 },
  { level: 16, speed: 110 },
  { level: 17, speed: 100 },
  { level: 18, speed: 90 },
  { level: 19, speed: 80 },
  { level: 20, speed: 70 },
];
