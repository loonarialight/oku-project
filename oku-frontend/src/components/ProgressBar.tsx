import "./ProgressBar.css";

interface ProgressBarProps {
  value: number;       
  height?: number;    
  showLabel?: boolean;
  color?: "default" | "xp" | "green" | "amber";
  animated?: boolean;
}

export default function ProgressBar({
  value,
  height = 4,
  showLabel = false,
  color = "default",
  animated = true,
}: ProgressBarProps) {
  const pct = Math.min(Math.max(value, 0), 100);

  return (
    <div className="pbar" style={{ height }}>
      <div
        className={`pbar__fill pbar__fill--${color}${animated ? " pbar__fill--anim" : ""}`}
        style={{ width: `${pct}%` }}
      />
      {showLabel && (
        <span className="pbar__label">{Math.round(pct)}%</span>
      )}
    </div>
  );
}