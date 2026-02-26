import ProgressBar from "./ProgressBar";
import "./LevelBadge.css";

interface LevelBadgeProps {
  level: number;
  xp: number;
  xpForCurrentLevel: number;
  xpToNextLevel: number;
  compact?: boolean;
}

export default function LevelBadge({
  level,
  xp,
  xpForCurrentLevel,
  xpToNextLevel,
  compact = false,
}: LevelBadgeProps) {
  const range = xpToNextLevel - xpForCurrentLevel;
  const progress = range > 0 ? ((xp - xpForCurrentLevel) / range) * 100 : 0;
  const remaining = xpToNextLevel - xp;

  if (compact) {
    return (
      <div className="lvl-compact">
        <span className="lvl-compact__badge">LVL {level}</span>
        <div className="lvl-compact__bar">
          <ProgressBar value={progress} height={3} color="xp" />
        </div>
        <span className="lvl-compact__xp">{xp} XP</span>
      </div>
    );
  }

  return (
    <div className="lvl-card">
      <div className="lvl-card__top">
        <div className="lvl-card__badge">
          <span className="lvl-card__num">{level}</span>
          <span className="lvl-card__label">LEVEL</span>
        </div>
        <div className="lvl-card__info">
          <span className="lvl-card__xp">{xp.toLocaleString()} XP</span>
          <span className="lvl-card__next">{remaining} to next level</span>
        </div>
      </div>
      <ProgressBar value={progress} height={5} color="xp" />
    </div>
  );
}