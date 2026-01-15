// src/App.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

import type { Board, Shape, Piece, PieceProto } from "./game/types";
import { GameBoard } from "./components/GameBoard";
import { NextPiecePanel } from "./components/NextPiecePanel";
import { ScorePanel } from "./components/ScorePanel";
import { ControlsPanel } from "./components/ControlsPanel";
import { LevelUpOverlay } from "./components/LevelUpOverlay";

/**
 * =========================
 * 설정값 (여기만 바꾸면 됨)
 * =========================
 */

// 보드 크기
const COLS = 14;
const ROWS = 20;

// 이번 판에서 사용할 블록 종류 개수 (타입 개수)
const SHAPE_TYPE_COUNT = 10;

// 블록 모양의 한 변 길이 N의 최소/최대 (N x N)
const MIN_SHAPE_SIZE = 3;
const MAX_SHAPE_SIZE = 4;

// 한 블록 안에 채워질 최소/최대 칸 수
const MIN_BLOCKS_PER_SHAPE = 3;
const MAX_BLOCKS_PER_SHAPE = 7;

// TGM 느낌의 레벨별 속도 테이블 (ms 단위)
const SPEED_TABLE: { level: number; speed: number }[] = [
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

/**
 * 금지 테트로미노 패턴 (7개) – 4x4 기준
 * 회전 + 정규화 후 동일하면 제외
 */
const FORBIDDEN_TETROMINOES: Shape[] = [
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
 * 유틸 함수
 */

// 빈 보드 생성
function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// N x N 회전
function rotateMatrix(matrix: Shape): Shape {
  const N = matrix.length;
  const result: Shape = Array.from({ length: N }, () => Array(N).fill(0));

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      result[y][x] = matrix[N - 1 - x][y];
    }
  }
  return result;
}

// 실제 블록이 있는 최소 bounding box로 잘라내기
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

function shapesEqual(a: Shape, b: Shape): boolean {
  if (a.length !== b.length || a[0].length !== b[0].length) return false;
  for (let y = 0; y < a.length; y++) {
    for (let x = 0; x < a[0].length; x++) {
      if (a[y][x] !== b[y][x]) return false;
    }
  }
  return true;
}

// 금지 패턴 미리 정규화
const FORBIDDEN_NORMALIZED = FORBIDDEN_TETROMINOES.map(normalizeShape);

// 주어진 shape가(회전 포함) 7 테트로미노 중 하나인지 검사
function isForbiddenTetromino(shape: Shape): boolean {
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

// 연결된 랜덤 N x N 모양 생성
function generateRandomShape(
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

  if (filled < minB) {
    return generateRandomShape(size, minBlocks, maxBlocks);
  }

  return shape;
}

// N x N 범위를 랜덤으로 뽑아서, 금지 테트로미노가 아닌 모양 생성
function generateLegalShapeRandomSize(): Shape {
  while (true) {
    const sizeRange = MAX_SHAPE_SIZE - MIN_SHAPE_SIZE + 1;
    const size = MIN_SHAPE_SIZE + Math.floor(Math.random() * sizeRange);

    const candidate = generateRandomShape(
      size,
      MIN_BLOCKS_PER_SHAPE,
      MAX_BLOCKS_PER_SHAPE
    );

    if (!isForbiddenTetromino(candidate)) {
      return candidate;
    }
  }
}

// 이번 판에서 준비된 프로토타입들 중 하나를 사용해 조각 생성
function createRandomPiece(protos: PieceProto[]): Piece {
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

// 블록 충돌 여부 판단
function collide(
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

      if (newX < 0 || newX >= COLS || newY >= ROWS) {
        return true;
      }
      if (newY < 0) continue;

      if (board[newY][newX]) {
        return true;
      }
    }
  }
  return false;
}

// 라인 클리어 처리
function clearLines(board: Board): { board: Board; lines: number } {
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
function getLineScore(lines: number, level: number): number {
  if (lines <= 0) return 0;

  const baseTable = [0, 100, 300, 500, 800];
  const base = baseTable[lines] ?? 0;

  return base * level;
}

/**
 * React 컴포넌트
 */
function App() {
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [linesCleared, setLinesCleared] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [colors, setColors] = useState<Record<number, string>>({});
  const [piecePrototypes, setPiecePrototypes] = useState<PieceProto[]>([]);

  // 누적 라인 수에 따른 레벨
  const level = useMemo(() => {
    return Math.floor(linesCleared / 5) + 1;
  }, [linesCleared]);

  // 레벨에 따른 낙하 속도
  const currentSpeed = useMemo(() => {
    const entry = SPEED_TABLE.find((e) => e.level === level);
    return entry ? entry.speed : SPEED_TABLE[SPEED_TABLE.length - 1].speed;
  }, [level]);

  // 타입 목록을 받아 각 타입별로 랜덤 밝은 색 생성
  function generateColorPalette(types: number[]): Record<number, string> {
    const palette: Record<number, string> = {};
    const usedHues: number[] = [];

    for (const type of types) {
      let hue: number;
      let attempts = 0;

      do {
        hue = Math.floor(Math.random() * 360);
        attempts++;
      } while (usedHues.some((h) => Math.abs(h - hue) < 25) && attempts < 10);

      usedHues.push(hue);

      const saturation = 80;
      const lightness = 55;

      palette[type] = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    return palette;
  }

  // 게임 초기화
  const resetGame = useCallback(() => {
    const empty = createEmptyBoard();

    // 이번 판에서 사용할 블록 프로토타입들 생성
    const protos: PieceProto[] = [];
    for (let i = 1; i <= SHAPE_TYPE_COUNT; i++) {
      protos.push({
        type: i,
        shape: generateLegalShapeRandomSize(),
      });
    }
    setPiecePrototypes(protos);

    const types = protos.map((p) => p.type);
    setColors(generateColorPalette(types));

    const first = createRandomPiece(protos);
    const second = createRandomPiece(protos);

    setBoard(empty);
    setScore(0);
    setGameOver(false);
    setLinesCleared(0);
    setShowLevelUp(false);

    if (collide(empty, first, 0, 0)) {
      setGameOver(true);
      setCurrentPiece(null);
      setNextPiece(null);
    } else {
      setCurrentPiece(first);
      setNextPiece(second);
    }
  }, []);

  // 첫 실행 시 게임 시작
  useEffect(() => {
    resetGame();
  }, [resetGame]);

  // 자동 낙하
  const tick = useCallback(() => {
    if (gameOver || !piecePrototypes.length) return;

    setCurrentPiece((prev) => {
      if (!prev) return prev;

      if (!collide(board, prev, 0, 1)) {
        return { ...prev, y: prev.y + 1 };
      }

      const { shape, x, y, type } = prev;
      const newBoard = board.map((row) => [...row]);

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const boardY = y + r;
          const boardX = x + c;
          if (boardY < 0) continue;
          newBoard[boardY][boardX] = type;
        }
      }

      const { board: clearedBoard, lines } = clearLines(newBoard);
      if (lines > 0) {
        setScore((s) => s + getLineScore(lines, level));
        setLinesCleared((prevTotal) => prevTotal + lines);
        setShowLevelUp(true);
      }
      setBoard(clearedBoard);

      const spawn = nextPiece ?? createRandomPiece(piecePrototypes);
      const queued = createRandomPiece(piecePrototypes);

      if (collide(clearedBoard, spawn, 0, 0)) {
        setGameOver(true);
        setNextPiece(null);
        return null;
      }

      setNextPiece(queued);
      return spawn;
    });
  }, [board, gameOver, nextPiece, level, piecePrototypes]);

  // 자동 낙하 interval
  useEffect(() => {
    if (gameOver) return;
    const id = window.setInterval(tick, currentSpeed);
    return () => window.clearInterval(id);
  }, [tick, gameOver, currentSpeed]);

  // 키보드 입력
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || !currentPiece || !piecePrototypes.length) return;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const dir = e.key === "ArrowLeft" ? -1 : 1;
        setCurrentPiece((prev) => {
          if (!prev) return prev;
          if (collide(board, prev, dir, 0)) return prev;
          return { ...prev, x: prev.x + dir };
        });
      } else if (e.key === "ArrowDown") {
        setCurrentPiece((prev) => {
          if (!prev) return prev;
          if (collide(board, prev, 0, 1)) return prev;
          return { ...prev, y: prev.y + 1 };
        });
      } else if (e.key === "ArrowUp") {
        setCurrentPiece((prev) => {
          if (!prev) return prev;
          const rotated = rotateMatrix(prev.shape);
          if (collide(board, { ...prev, shape: rotated }, 0, 0, rotated)) {
            return prev;
          }
          return { ...prev, shape: rotated };
        });
      } else if (e.key === " ") {
        // 하드 드롭
        e.preventDefault();

        setCurrentPiece((prev) => {
          if (!prev) return prev;

          let ghost = { ...prev };
          while (!collide(board, ghost, 0, 1)) {
            ghost = { ...ghost, y: ghost.y + 1 };
          }

          const { shape, x, y, type } = ghost;
          const newBoard = board.map((row) => [...row]);

          for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
              if (!shape[r][c]) continue;
              const boardY = y + r;
              const boardX = x + c;
              if (boardY < 0) continue;
              newBoard[boardY][boardX] = type;
            }
          }

          const { board: clearedBoard, lines } = clearLines(newBoard);
          if (lines > 0) {
            setScore((s) => s + getLineScore(lines, level));
            setLinesCleared((prevTotal) => prevTotal + lines);
            setShowLevelUp(true);
          }
          setBoard(clearedBoard);

          const spawn = nextPiece ?? createRandomPiece(piecePrototypes);
          const queued = createRandomPiece(piecePrototypes);

          if (collide(clearedBoard, spawn, 0, 0)) {
            setGameOver(true);
            setNextPiece(null);
            return null;
          }

          setNextPiece(queued);
          return spawn;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [board, currentPiece, gameOver, level, nextPiece, piecePrototypes]);

  // 레벨업 애니메이션 숨김
  useEffect(() => {
    if (!showLevelUp) return;
    const id = window.setTimeout(() => {
      setShowLevelUp(false);
    }, 800);
    return () => window.clearTimeout(id);
  }, [showLevelUp]);

  // 렌더링용 보드
  const displayBoard: Board = useMemo(() => {
    const clone = board.map((row) => [...row]);
    if (!currentPiece) return clone;

    const { shape, x, y, type } = currentPiece;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;

        const boardY = y + r;
        const boardX = x + c;
        if (boardY < 0 || boardY >= ROWS || boardX < 0 || boardX >= COLS)
          continue;
        clone[boardY][boardX] = type;
      }
    }
    return clone;
  }, [board, currentPiece]);

  return (
    <div className="app">
      {showLevelUp && <LevelUpOverlay level={level} />}

      <div className="game">
        <GameBoard
          board={displayBoard}
          cols={COLS}
          rows={ROWS}
          colors={colors}
        />

        <div className="side">
          <ScorePanel
            score={score}
            level={level}
            gameOver={gameOver}
            onReset={resetGame}
          />

          <NextPiecePanel nextPiece={nextPiece} colors={colors} />

          <ControlsPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
