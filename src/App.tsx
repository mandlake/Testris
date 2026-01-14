// src/App.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

// 보드 크기
const COLS = 14;
const ROWS = 24;

// TGM 느낌의 레벨별 속도 테이블 (ms 단위)
// 실제 TGM과 1:1은 아니지만, 초반 → 중반 → 후반으로 갈수록 급격히 빨라지도록 설계
const SPEED_TABLE: { level: number; speed: number }[] = [
  { level: 1, speed: 800 }, // 아주 느리게 시작 (연습 구간)
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
  { level: 20, speed: 70 }, // 후반 거의 '떨어지는' 수준
];

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

// 클리어한 줄 수와 레벨에 따른 점수 계산
function getLineScore(lines: number, level: number): number {
  if (lines <= 0) return 0;

  // BlockDropGame 계열 기본 포인트 (1~4줄)
  // 1줄: 100, 2줄: 300, 3줄: 500, 4줄: 800
  const baseTable = [0, 100, 300, 500, 800];
  const base = baseTable[lines] ?? 0;

  // 레벨 보너스: base * level
  return base * level;
}

function App() {
  // 보드 상태
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  // 현재 떨어지는 블록
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  // 다음 블록 (Next 미리보기용)
  const [nextPiece, setNextPiece] = useState<Piece | null>(null);
  // 점수
  const [score, setScore] = useState(0);
  // 게임 종료 여부
  const [gameOver, setGameOver] = useState(false);
  // 지금까지 클리어한 총 라인 수
  const [linesCleared, setLinesCleared] = useState(0);
  // 레벨업 애니메이션 표시 여부
  const [showLevelUp, setShowLevelUp] = useState(false);

  // 누적 라인 수에 따른 레벨 계산 (예: 5줄당 1레벨 업)
  const level = useMemo(() => {
    // 0~4줄: 1레벨, 5~9줄: 2레벨...
    const lvl = Math.floor(linesCleared / 5) + 1;
    return lvl; // 더 이상 상한 없음
  }, [linesCleared]);

  // 레벨에 따른 낙하 속도(ms) 결정 (TGM 스타일 테이블 사용)
  const currentSpeed = useMemo(() => {
    const entry = SPEED_TABLE.find((e) => e.level === level);
    return entry ? entry.speed : SPEED_TABLE[SPEED_TABLE.length - 1].speed;
  }, [level]);

  // 게임 초기화
  const resetGame = useCallback(() => {
    const empty = createEmptyBoard();
    const first = createRandomPiece();
    const second = createRandomPiece(); // Next 블록

    setBoard(empty);
    setScore(0);
    setGameOver(false);
    setLinesCleared(0); // 누적 라인 수 초기화
    setShowLevelUp(false); // 레벨업 애니메이션 초기화

    // 시작부터 충돌 = 즉시 게임 오버
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

          // 위 영역은 무시
          if (boardY < 0) continue;

          newBoard[boardY][boardX] = type;
        }
      }

      // 라인 클리어
      const { board: clearedBoard, lines } = clearLines(newBoard);
      if (lines > 0) {
        // 점수 증가
        setScore((s) => s + getLineScore(lines, level));

        // 누적 라인 수 / 레벨업 처리 (기존 로직 그대로 유지)
        setLinesCleared((prevTotal) => {
          const newTotal = prevTotal + lines;

          return newTotal;
        });

        // 레벨업 애니메이션: 이전 레벨과 비교해서 올랐으면 표시
        // (tick 전에 계산된 level과, linesCleared + lines 이후 레벨을 비교)
        // 이 부분은 tick 바깥에서 계산된 level을 쓰고 있기 때문에,
        // 간단하게 "라인 클리어마다 애니메이션"으로 처리해도 된다.
        setShowLevelUp(true);
      }
      setBoard(clearedBoard);

      // Next 블록을 실제로 스폰할 블록으로 사용
      const spawn = nextPiece ?? createRandomPiece();
      // 그 다음 Next 큐에 들어갈 새 블록
      const queued = createRandomPiece();

      // 새 블록 생성 불가 -> 게임 오버
      if (collide(clearedBoard, spawn, 0, 0)) {
        setGameOver(true);
        setNextPiece(null);
        return null;
      }

      setNextPiece(queued);
      return spawn;
    });
  }, [board, gameOver, nextPiece]);

  // 자동 낙하 interval 설정 (레벨에 따라 속도 변경)
  useEffect(() => {
    if (gameOver) return;
    const id = window.setInterval(tick, currentSpeed);
    return () => window.clearInterval(id);
  }, [tick, gameOver, currentSpeed]);

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
        e.preventDefault(); // 스페이스 스크롤 방지

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
            // 레벨 기반 점수 증가
            setScore((s) => s + getLineScore(lines, level));

            setLinesCleared((prevTotal) => {
              const newTotal = prevTotal + lines;

              // 레벨업 처리 로직은 기존 그대로

              return newTotal;
            });
            setShowLevelUp(true);
          }
          setBoard(clearedBoard);

          // 4) Next 블록에서 하나 꺼내 스폰
          const spawn = nextPiece ?? createRandomPiece();
          const queued = createRandomPiece();

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
  }, [board, currentPiece, gameOver]);

  // 레벨업 애니메이션 일정 시간 후 자동 숨김
  useEffect(() => {
    if (!showLevelUp) return;
    const id = window.setTimeout(() => {
      setShowLevelUp(false);
    }, 800); // 0.8초 정도 표시

    return () => window.clearTimeout(id);
  }, [showLevelUp]);

  // 랜더링용 보드 생성 (현재 떨어지는 블록 포함해서 표시)
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
      {/* 레벨업 애니메이션 오버레이 */}
      {showLevelUp && (
        <div className="level-up-overlay">
          <div className="level-up-text">LEVEL {level}</div>
        </div>
      )}
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
            <div className="level">레벨: {level}</div>
            {gameOver && <div className="status">GAME OVER</div>}
          </div>

          <div className="panel">
            <h2>다음 블록</h2>
            {/* nextPiece가 있으면 4X4 미리보기 보드로 랜더링 */}
            {nextPiece ? (
              <div className="next-board">
                {nextPiece.shape.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`next-cell ${
                        cell ? "filled type-" + nextPiece.type : ""
                      }`}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="next-empty">없음</div>
            )}
          </div>

          <div className="panel">
            <h2>조작법</h2>
            <ul>
              <li>← → : 좌우 이동</li>
              <li>↓ : 한 칸 내리기</li>
              <li>↑ : 회전</li>
              <li>Space : 하드드롭</li>
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
