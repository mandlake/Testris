// src/App.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import "./styles/App.css";

import { GameBoard } from "./components/GameBoard";
import { ScorePanel } from "./components/ScorePanel";
import { NextPiecePanel } from "./components/NextPiecePanel";
import { ControlsPanel } from "./components/ControlsPanel";
import { LevelUpOverlay } from "./components/LevelUpOverlay";
import { PrototypePanel } from "./components/PrototypePanel";

import {
  COLS,
  ROWS,
  SPEED_TABLE,
  createEmptyBoard,
  rotateMatrix,
  clearLines,
  collide,
  getLineScore,
  generateShapePrototypes,
  createRandomPiece,
  type Board,
  type Piece,
  type PieceProto,
} from "./logic";

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
    const protos = generateShapePrototypes();
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

      // 한 칸 내려갈 수 있으면 이동
      if (!collide(board, prev, 0, 1)) {
        return { ...prev, y: prev.y + 1 };
      }

      // 더 이상 못 내려가면 보드에 고정
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

      // 다음 조각 스폰
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
        // 회전
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

          let ghost: Piece = { ...prev };
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

  // 렌더링용 보드 (현재 조각 합성)
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

  // 👇 고스트 피스 계산
  const ghostPiece: Piece | null = useMemo(() => {
    if (!currentPiece) return null;

    // 현재 보드를 기준으로, 현재 조각을 아래로 끝까지 내려본다
    let ghost: Piece = { ...currentPiece };
    while (!collide(board, ghost, 0, 1)) {
      ghost = { ...ghost, y: ghost.y + 1 };
    }
    return ghost;
  }, [board, currentPiece]);

  return (
    <div className="app">
      {showLevelUp && <LevelUpOverlay level={level} />}

      <div className="game">
        {/* 1: 이번 판 블록 목록 패널 */}
        <PrototypePanel piecePrototypes={piecePrototypes} colors={colors} />

        {/* 2: 메인 게임 보드 */}
        <GameBoard
          board={displayBoard}
          cols={COLS}
          rows={ROWS}
          colors={colors}
          ghostPiece={ghostPiece}
        />

        {/* 3: 점수 / 다음 블록 / 조작법 패널 */}
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
