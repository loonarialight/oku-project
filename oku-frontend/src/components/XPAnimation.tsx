import { useEffect, useState } from "react";
import "./XPAnimation.css";

interface XPAnimationProps {
  amount: number;
  onDone?: () => void;
}

export default function XPAnimation({ amount, onDone }: XPAnimationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 1400);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className="xp-anim">
      <span className="xp-anim__text">+{amount} XP</span>
    </div>
  );
}