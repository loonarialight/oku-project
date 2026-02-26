import { useContext } from "react";
import { UserContext } from "./ts/UserContext";
import type { UserContextType } from "./ts/UserContext";

export function useUser(): UserContextType {
  return useContext(UserContext);
}