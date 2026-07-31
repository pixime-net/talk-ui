import { useState, useCallback, useMemo } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { CopilotKit } from "@copilotkit/react-core/v2";
import { agents } from "../config/agent";
import { AgentErrorContext } from "../config/error-context";

function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-muted">404 — Page not found</p>
    </main>
  );
}

function RootLayout() {
  const [error, setError] = useState<string | null>(null);
  const contextValue = useMemo(() => ({ error, setError }), [error]);

  const handleError = useCallback(
    (event: {
      error?: { message?: string };
      context?: { request?: { url?: string } };
    }) => {
      const errorMessage = event.error?.message?.trim();
      const fallback = event.context?.request?.url
        ? `Erreur de connexion à ${event.context.request.url}`
        : "Une erreur inattendue est survenue";
      const message =
        errorMessage && errorMessage.length > 0 ? errorMessage : fallback;
      setError(message);
    },
    [],
  );

  return (
    <AgentErrorContext.Provider value={contextValue}>
      <CopilotKit agents__unsafe_dev_only={agents} onError={handleError}>
        <Outlet />
      </CopilotKit>
    </AgentErrorContext.Provider>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});
