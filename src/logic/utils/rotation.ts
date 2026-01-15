/**
 * src/logic/utils/rotation.ts
 * 유틸 함수
 */
import type { Shape } from "../types";

// N x N 회전
export function rotateMatrix(matrix: Shape): Shape {
  const N = matrix.length;
  const result: Shape = Array.from({ length: N }, () => Array(N).fill(0));

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      result[y][x] = matrix[N - 1 - x][y];
    }
  }
  return result;
}
