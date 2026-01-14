// src/App.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

// 보드 크기
const COLS = 10;
const ROWS = 20;

// 타입 정의
type Cell = number;
type Board = Cell[][];
type Shape = number[][];

// 현재 조각(Piece)의 형태
interface Piece {
  shape: Shape; // 4X4 테트로미노 모양
  x: number; // 보드 상의 x 위치
  y: number; // 보드 상의 y 위치
  type: number; // 블록 종류(색상 구분용)
}

// 테트로미노 정의 (4X4 매트릭스)
const TETROMINOES: { type: number; shape: Shape }[] = [
  {
    type: 1, // I
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    type: 2, // Z
    shape: [
      [0, 0, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    type: 3, // S
    shape: [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    type: 4, // O
    shape: [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    type: 5, // T
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    type: 6, // L
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [1, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    type: 7, // J
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 0],
    ],
  },
];

// 빈 보드 생성
function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// 4X4 매트릭스(블록) 90도 회전
function rotateMatrix(matrix: Shape): Shape {
  const N = matrix.length;
  const result: Shape = Array.from({ length: N }, () => Array(N).fill(0));

  // 시계방향 회전 공식
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      result[y][x] = matrix[N - 1 - x][y];
    }
  }
  return result;
}

// 랜덤 블록 생성
function createRandomPiece(): Piece {
  const proto = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  return {
    shape: proto.shape.map((row) => [...row]), // 깊은 복사
    x: 3, // 가운데 근처
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
      if (!shape[y][x]) continue; // 빈칸은 무시

      const newX = xPos + x;
      const newY = yPos + y;

      // 벽 또는 방향 충돌
      if (newX < 0 || newX >= COLS || newY >= ROWS) {
        return true;
      }
      // 새로 생성된 부분(보드 위 영역)은 충돌 무시
      if (newY < 0) continue;

      // 이미 쌓인 블록 충돌
      if (board[newY][newX]) {
        return true;
      }
    }
  }
  return false;
}

// 라인 완성 시 삭제 후 위에서 내려오도록 처리
function clearLines(board: Board): { board: Board; lines: number } {
  let lines = 0;
  const newBoard = board.map((row) => [...row]);

  for (let row = ROWS - 1; row >= 0; row--) {
    if (newBoard[row].every((cell) => cell !== 0)) {
      // 해당 줄 삭제 후 맨 위에 빈 줄 추가
      newBoard.splice(row, 1);
      newBoard.unshift(Array(COLS).fill(0));
      lines++;
      row++;
    }
  }

  return { board: newBoard, lines };
}

function App() {
  // 보드 상태
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  // 현재 떨어지는 블록
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  // 점수
  const [score, setScore] = useState(0);
  // 게임 종료 여부
  const [gameOver, setGameOver] = useState(false);

  // 게임 초기화
  const resetGame = useCallback(() => {
    const empty = createEmptyBoard();
    const first = createRandomPiece();

    setBoard(empty);
    setScore(0);
    setGameOver(false);

    // 시작부터 충돌 = 즉시 게임 오버
    if (collide(empty, first, 0, 0)) {
      setGameOver(true);
      setCurrentPiece(null);
    } else {
      setCurrentPiece(first);
    }
  }, []);

  // 첫 실행 시 게임 시작
  useEffect(() => {
    resetGame();
  }, [resetGame]);

  // 자동 낙하(0.5초마다 한 칸)
  const tick = useCallback(() => {
    if (gameOver) return;

    setCurrentPiece((prev) => {
      if (!prev) return prev;

      // 아래로 이동 가능
      if (!collide(board, prev, 0, 1)) {
        return { ...prev, y: prev.y + 1 };
      }

      // 이동 불가 -> 보드에 고정
      const { shape, x, y, type } = prev;
      const newBoard = board.map((row) => [...row]);

      // 현재 블록을 보드에 기록
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const boardY = y + r;
          const boardX = x + c;
          if (boardY < 0) continue; // 위 영역은 무시
          newBoard[boardY][boardX] = type;
        }
      }

      // 라인 클리어
      const { board: clearedBoard, lines } = clearLines(newBoard);
      if (lines > 0) setScore((s) => s + lines * 100);
      setBoard(clearedBoard);

      // 다음 블록 생성
      const next = createRandomPiece();
      if (collide(clearedBoard, next, 0, 0)) {
        // 스폰 불가 -> 게임 오버
        setGameOver(true);
        return null;
      }
      return next;
    });
  }, [board, gameOver]);

  // 자동 낙하 interval 설정
  useEffect(() => {
    if (gameOver) return;
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [tick, gameOver]);

  // 키보드 입력 처리 (좌우 이동, 회전, 하드드롭 포함)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || !currentPiece) return;

      // 좌/우 이동
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const dir = e.key === "ArrowLeft" ? -1 : 1;
        setCurrentPiece((prev) => {
          if (!prev) return prev;
          if (collide(board, prev, dir, 0)) return prev; // 충돌 시 무시
          return { ...prev, x: prev.x + dir };
        });
      }

      // 아래로 한 칸
      else if (e.key === "ArrowDown") {
        setCurrentPiece((prev) => {
          if (!prev) return prev;
          if (collide(board, prev, 0, 1)) return prev;
          return { ...prev, y: prev.y + 1 };
        });
      }

      // 회전
      else if (e.key === "ArrowUp") {
        setCurrentPiece((prev) => {
          if (!prev) return prev;

          const rotated = rotateMatrix(prev.shape);

          // 회전 시 충돌하면 회전 취소
          if (collide(board, { ...prev, shape: rotated }, 0, 0, rotated)) {
            return prev;
          }
          return { ...prev, shape: rotated };
        });
      }

      // 하드 드롭 (Space)
      else if (e.key === " ") {
        e.preventDefault(); // 페이지 스크롤 방지

        setCurrentPiece((prev) => {
          if (!prev) return prev;

          // 1) 충돌 직전까지 ghost.y++ 반복
          let ghost = { ...prev };
          while (!collide(board, ghost, 0, 1)) {
            ghost = { ...ghost, y: ghost.y + 1 };
          }

          // 2) ghost 위치에 고정
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

          // 3) 라인 클리어 및 점수 추가
          const { board: clearedBoard, lines } = clearLines(newBoard);
          if (lines > 0) {
            setScore((s) => s + lines * 100);
          }
          setBoard(clearedBoard);

          // 4) 다음 블록 생성
          const next = createRandomPiece();
          if (collide(clearedBoard, next, 0, 0)) {
            // 생성 불가 -> 게임 오버
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

  // 랜더링 용 보드 생성 (현재 떨어지는 블록 포함해서 표시)
  const displayBoard: Board = useMemo(() => {
    const clone = board.map((row) => [...row]);
    if (!currentPiece) return clone;

    const { shape, x, y, type } = currentPiece;

    // 현재 블록을 랜더링 보드에 겹쳐서 표시
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;

        const boardY = y + r;
        const boardX = x + c;

        // 범위에 벗어난 경우 무시
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
        {/* 실제 게임 보드 랜더링 */}
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

        {/* 우측 패널 */}
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
