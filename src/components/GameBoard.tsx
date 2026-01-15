// src/components/GameBoard.tsx
import type { Board } from "../game/types";

interface GameBoardProps {
  board: Board;
  cols: number;
  rows: number;
  colors: Record<number, string>;
}

export const GameBoard = ({ board, cols, rows, colors }: GameBoardProps) => {
  return (
    <div
      className="board"
      style={
        {
          // App.css에서 사용중인 CSS 변수 그대로 넘김
          "--cols": cols,
          "--rows": rows,
        } as React.CSSProperties
      }
    >
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className={`cell ${cell ? "filled" : ""}`}
            style={cell ? { backgroundColor: colors[cell] } : undefined}
          />
        ))
      )}
    </div>
  );
};
