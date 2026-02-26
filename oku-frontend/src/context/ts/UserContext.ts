import { createContext } from "react";
import type { UserStats } from "../../types/api";

export interface UserContextType {
  stats: UserStats | null;
  loading: boolean;
  fetchStats: () => Promise<void>;
  addXP: (amount: number) => void;
}

export const UserContext = createContext<UserContextType>({
  stats: null,
  loading: false,
  fetchStats: async () => {},
  addXP: () => {},
});