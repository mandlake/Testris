// src/components/LevelUpOverlay.tsx
interface LevelUpOverlayProps {
  level: number;
}

export const LevelUpOverlay = ({ level }: LevelUpOverlayProps) => {
  return (
    <div className="level-up-overlay">
      <div className="level-up-text">LEVEL {level}</div>
    </div>
  );
};
