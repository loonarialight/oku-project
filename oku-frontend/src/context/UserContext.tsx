import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import api from "../services/api";
import { UserContext } from "./ts/UserContext";
import type { UserStats } from "../types/api";

export function UserProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await api.get<UserStats>("/profile/stats");
      setStats(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const addXP = useCallback((amount: number): void => {
    setStats((prev) => {
      if (!prev) return prev;
      const newXP = prev.xp + amount;

      if (newXP >= prev.xpToNextLevel) {
        const range = prev.xpToNextLevel - prev.xpForCurrentLevel;
        return {
          ...prev,
          xp: newXP,
          level: prev.level + 1,
          xpForCurrentLevel: prev.xpToNextLevel,
          xpToNextLevel: prev.xpToNextLevel + range,
        };
      }

      return { ...prev, xp: newXP };
    });

    setTimeout(() => {
      void api.get<UserStats>("/profile/stats")
        .then((res) => setStats(res.data))
        .catch(() => {});
    }, 800);
  }, []);

  return (
    <UserContext.Provider value={{ stats, loading, fetchStats, addXP }}>
      {children}
    </UserContext.Provider>
  );
}