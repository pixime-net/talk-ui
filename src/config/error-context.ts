import { createContext, useContext } from "react";

interface ErrorContextValue {
  error: string | null;
  setError: (error: string | null) => void;
}

export const AgentErrorContext = createContext<ErrorContextValue>({
  error: null,
  setError: () => {},
});

export function useAgentError() {
  return useContext(AgentErrorContext);
}
