// src/components/NextPiecePanel.tsx
import type { Piece } from "../game/types";

interface NextPiecePanelProps {
  nextPiece: Piece | null;
  colors: Record<number, string>;
}

export const NextPiecePanel = ({ nextPiece, colors }: NextPiecePanelProps) => {
  return (
    <div className="panel">
      <h2>다음 블록</h2>
      {nextPiece ? (
        <div className="next-board">
          {nextPiece.shape.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`next-cell ${cell ? "filled" : ""}`}
                style={
                  cell
                    ? {
                        backgroundColor: colors[nextPiece.type],
                      }
                    : undefined
                }
              />
            ))
          )}
        </div>
      ) : (
        <div className="next-empty">없음</div>
      )}
    </div>
  );
};
