// src/components/GameBoard.tsx
import type { CSSProperties } from "react";
import type { Board, Piece } from "../logic";

interface GameBoardProps {
  board: Board;
  cols: number;
  rows: number;
  colors: Record<number, string>;
  ghostPiece?: Piece | null;
}

export const GameBoard = ({
  board,
  cols,
  rows,
  colors,
  ghostPiece,
}: GameBoardProps) => {
  const isGhostCell = (rowIndex: number, colIndex: number): boolean => {
    if (!ghostPiece) return false;

    const { shape, x, y } = ghostPiece;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;

        const boardY = y + r;
        const boardX = x + c;

        if (boardY === rowIndex && boardX === colIndex) return true;
      }
    }

    return false;
  };

  return (
    <div
      className="board"
      style={
        {
          "--cols": cols,
          "--rows": rows,
        } as CSSProperties
      }
    >
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const filled = cell !== 0;
          const ghost = !filled && isGhostCell(rowIndex, colIndex); // 👈 빈 칸 + 고스트 위치일 때만

          let className = "cell";
          let style: CSSProperties | undefined = undefined;

          if (filled) {
            className += " filled";
            style = { backgroundColor: colors[cell] };
          } else if (ghost && ghostPiece) {
            className += " ghost";
            style = { backgroundColor: colors[ghostPiece.type] };
          }

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={className}
              style={style}
            />
          );
        })
      )}
    </div>
  );
};
