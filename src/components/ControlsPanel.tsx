// src/components/ControlsPanel.tsx
export const ControlsPanel = () => {
  return (
    <div className="panel">
      <h2>조작법</h2>
      <ul>
        <li>← → : 좌우 이동</li>
        <li>↓ : 한 칸 내리기</li>
        <li>↑ : 회전</li>
        <li>Space : 하드드롭</li>
      </ul>
    </div>
  );
};
