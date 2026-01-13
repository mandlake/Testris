// src/App.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const COLS = 10;
const ROWS = 20;

type Cell = number;
type Board = Cell[][];
type Shape = number[][];

interface Piece {
  shape: Shape;
  x: number;
  y: number;
  type: number;
}

const TETROMINOES: { type: number; shape: Shape }[] = [
  {
    type: 1,
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    type: 2,
    shape: [
      [0, 0, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    type: 3,
    shape: [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    type: 4,
    shape: [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    type: 5,
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    type: 6,
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [1, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    type: 7,
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 0],
    ],
  },
];

function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

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

function createRandomPiece(): Piece {
  const proto = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  return {
    shape: proto.shape.map((row) => [...row]),
    x: 3,
    y: 0,
    type: proto.type,
  };
}

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

function App() {
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const resetGame = useCallback(() => {
    const empty = createEmptyBoard();
    const first = createRandomPiece();

    setBoard(empty);
    setScore(0);
    setGameOver(false);

    if (collide(empty, first, 0, 0)) {
      setGameOver(true);
      setCurrentPiece(null);
    } else {
      setCurrentPiece(first);
    }
  }, []);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  const tick = useCallback(() => {
    if (gameOver) return;

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
        setScore((s) => s + lines * 100);
      }
      setBoard(clearedBoard);

      const next = createRandomPiece();
      if (collide(clearedBoard, next, 0, 0)) {
        setGameOver(true);
        return null;
      }
      return next;
    });
  }, [board, gameOver]);

  useEffect(() => {
    if (gameOver) return;
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [tick, gameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || !currentPiece) return;

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
        // 🔹 하드 드롭 (Space)
        e.preventDefault(); // 페이지 스크롤 방지

        setCurrentPiece((prev) => {
          if (!prev) return prev;

          // 1) 고스트처럼 바닥까지 내리기
          let ghost = { ...prev };
          while (!collide(board, ghost, 0, 1)) {
            ghost = { ...ghost, y: ghost.y + 1 };
          }

          // 2) 그 위치에 바로 고정
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

          // 3) 라인 클리어 및 점수
          const { board: clearedBoard, lines } = clearLines(newBoard);
          if (lines > 0) {
            setScore((s) => s + lines * 100);
          }
          setBoard(clearedBoard);

          // 4) 다음 블록 생성, 생성 불가면 게임 오버
          const next = createRandomPiece();
          if (collide(clearedBoard, next, 0, 0)) {
            setGameOver(true);
            return null;
          }

          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [board, currentPiece, gameOver]);

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
      <div className="game">
        <div className="board">
          {displayBoard.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`cell ${cell ? "filled type-" + cell : ""}`}
              />
            ))
          )}
        </div>
        <div className="side">
          <div className="panel">
            <h2>점수</h2>
            <div className="score">{score}</div>
            {gameOver && <div className="status">GAME OVER</div>}
          </div>
          <div className="panel">
            <h2>조작법</h2>
            <ul>
              <li>← → : 좌우 이동</li>
              <li>↓ : 한 칸 내리기</li>
              <li>↑ : 회전</li>
            </ul>
            {gameOver && (
              <button className="btn" onClick={resetGame}>
                다시 시작
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
