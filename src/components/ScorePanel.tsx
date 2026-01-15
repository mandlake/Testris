// src/components/ScorePanel.tsx
interface ScorePanelProps {
  score: number;
  level: number;
  gameOver: boolean;
  onReset: () => void;
}

export const ScorePanel = ({
  score,
  level,
  gameOver,
  onReset,
}: ScorePanelProps) => {
  return (
    <div className="panel">
      <h2>점수</h2>
      <div className="score">{score}</div>
      <div className="level">레벨: {level}</div>
      {gameOver && (
        <>
          <div className="status">GAME OVER</div>
          <button className="btn" onClick={onReset}>
            다시 시작
          </button>
        </>
      )}
    </div>
  );
};
