// logic/utils/shapeGenerator.ts
import type { Shape, Piece, PieceProto } from "../types";
import {
  COLS,
  SHAPE_TYPE_COUNT,
  MIN_SHAPE_SIZE,
  MAX_SHAPE_SIZE,
  MIN_BLOCKS_PER_SHAPE,
  MAX_BLOCKS_PER_SHAPE,
} from "../constants";
import { rotateMatrix } from "./rotation";

/**
 * 1. 금지 테트로미노 패턴 (4x4 기준)
 *    - I, Z, S, O, T, L, J
 *    - 내부적으로 정규화해서 비교
 */
const RAW_FORBIDDEN_TETROMINOES: Shape[] = [
  // I
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // Z
  [
    [0, 0, 0, 0],
    [1, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
  ],
  // S
  [
    [0, 0, 0, 0],
    [0, 1, 1, 0],
    [1, 1, 0, 0],
    [0, 0, 0, 0],
  ],
  // O
  [
    [0, 0, 0, 0],
    [0, 1, 1, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
  ],
  // T
  [
    [0, 0, 0, 0],
    [1, 1, 1, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 0],
  ],
  // L
  [
    [0, 0, 0, 0],
    [1, 1, 1, 0],
    [1, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // J
  [
    [0, 0, 0, 0],
    [1, 1, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 0],
  ],
];

/**
 * 2. shape 정규화
 *    - 실제 블록(1)이 들어 있는 최소 bounding box로 잘라냄
 */
function normalizeShape(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;

  let minRow = rows;
  let maxRow = -1;
  let minCol = cols;
  let maxCol = -1;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (shape[y][x]) {
        if (y < minRow) minRow = y;
        if (y > maxRow) maxRow = y;
        if (x < minCol) minCol = x;
        if (x > maxCol) maxCol = x;
      }
    }
  }

  // 블록이 하나도 없는 경우
  if (maxRow === -1) {
    return [[0]];
  }

  const result: Shape = [];
  for (let y = minRow; y <= maxRow; y++) {
    const row: number[] = [];
    for (let x = minCol; x <= maxCol; x++) {
      row.push(shape[y][x]);
    }
    result.push(row);
  }
  return result;
}

/**
 * 3. shape 동등성 비교
 */
function shapesEqual(a: Shape, b: Shape): boolean {
  if (a.length !== b.length || a[0].length !== b[0].length) return false;
  for (let y = 0; y < a.length; y++) {
    for (let x = 0; x < a[0].length; x++) {
      if (a[y][x] !== b[y][x]) return false;
    }
  }
  return true;
}

/**
 * 4. 금지 패턴을 정규화해 미리 캐싱
 */
const FORBIDDEN_NORMALIZED: Shape[] =
  RAW_FORBIDDEN_TETROMINOES.map(normalizeShape);

/**
 * 5. 주어진 shape가(회전 포함) 금지 테트로미노 중 하나인지 검사
 */
export function isForbiddenTetromino(shape: Shape): boolean {
  let current: Shape = shape;

  for (let r = 0; r < 4; r++) {
    const norm = normalizeShape(current);
    for (const forbidden of FORBIDDEN_NORMALIZED) {
      if (shapesEqual(norm, forbidden)) return true;
    }
    current = rotateMatrix(current);
  }

  return false;
}

/**
 * 6. size x size 격자에서 "연결된" 랜덤 모양 생성
 *    - minBlocks ~ maxBlocks 범위 내에서 1을 채운다
 *    - BFS/DFS 스타일로 frontier를 확장하면서 연결성 보장
 */
export function generateRandomConnectedShape(
  size: number,
  minBlocks: number,
  maxBlocks: number
): Shape {
  const maxPossible = size * size;
  const minB = Math.max(1, Math.min(minBlocks, maxPossible));
  const maxB = Math.max(minB, Math.min(maxBlocks, maxPossible));

  const targetBlocks = minB + Math.floor(Math.random() * (maxB - minB + 1));

  const shape: Shape = Array.from({ length: size }, () => Array(size).fill(0));

  // 시작점 랜덤
  let sy = Math.floor(Math.random() * size);
  let sx = Math.floor(Math.random() * size);
  shape[sy][sx] = 1;
  let filled = 1;

  let frontier: { x: number; y: number }[] = [{ x: sx, y: sy }];
  const neighbors = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  while (filled < targetBlocks && frontier.length > 0) {
    const idx = Math.floor(Math.random() * frontier.length);
    const { x, y } = frontier[idx];

    const emptyNeighbors: { x: number; y: number }[] = [];
    for (const { dx, dy } of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size && shape[ny][nx] === 0) {
        emptyNeighbors.push({ x: nx, y: ny });
      }
    }

    if (emptyNeighbors.length === 0) {
      frontier.splice(idx, 1);
      continue;
    }

    const choice =
      emptyNeighbors[Math.floor(Math.random() * emptyNeighbors.length)];
    if (!shape[choice.y][choice.x]) {
      shape[choice.y][choice.x] = 1;
      filled++;
      frontier.push(choice);
    }
  }

  // 만약 최소 블록 수를 만족 못 했으면 재귀적으로 다시 시도
  if (filled < minB) {
    return generateRandomConnectedShape(size, minBlocks, maxBlocks);
  }

  return shape;
}

/**
 * 7. N x N 범위를 랜덤으로 뽑아, 금지 테트로미노가 아닌 모양을 생성
 *    - 기본값은 전역 상수(MIN_SHAPE_SIZE, MAX_SHAPE_SIZE, ...)
 */
export function generateLegalShapeRandomSize(
  minSize = MIN_SHAPE_SIZE,
  maxSize = MAX_SHAPE_SIZE,
  minBlocks = MIN_BLOCKS_PER_SHAPE,
  maxBlocks = MAX_BLOCKS_PER_SHAPE
): Shape {
  while (true) {
    const sizeRange = maxSize - minSize + 1;
    const size = minSize + Math.floor(Math.random() * sizeRange);

    const candidate = generateRandomConnectedShape(size, minBlocks, maxBlocks);

    if (!isForbiddenTetromino(candidate)) {
      return candidate;
    }
  }
}

/**
 * 8. 이번 판에서 사용할 블록 프로토타입들 생성
 *    - 기본적으로 SHAPE_TYPE_COUNT 개 생성
 *    - type: 1 ~ count
 */
export function generateShapePrototypes(
  count: number = SHAPE_TYPE_COUNT
): PieceProto[] {
  const protos: PieceProto[] = [];
  for (let i = 1; i <= count; i++) {
    protos.push({
      type: i,
      shape: generateLegalShapeRandomSize(),
    });
  }
  return protos;
}

/**
 * 9. 프로토타입 리스트에서 랜덤으로 하나 뽑아 Piece 생성
 *    - proos가 비어 있으면 임시 shape를 하나 생성해서 사용
 *    - x는 COLS 기준 중앙 스폰
 */
export function createRandomPiece(protos: PieceProto[]): Piece {
  const list =
    protos.length > 0
      ? protos
      : [{ type: 1, shape: generateLegalShapeRandomSize() }];

  const proto = list[Math.floor(Math.random() * list.length)];
  const size = proto.shape.length;
  const spawnX = Math.floor(COLS / 2) - Math.floor(size / 2);

  return {
    shape: proto.shape.map((row) => [...row]),
    x: spawnX,
    y: 0,
    type: proto.type,
  };
}
