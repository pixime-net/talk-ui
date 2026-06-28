import { useState, useCallback } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { CopilotKit } from "@copilotkit/react-core/v2";
import { agents } from "../config/agent";
import { AgentErrorContext } from "../config/error-context";

function RootLayout() {
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(
    (event: {
      error?: { message?: string };
      context?: { request?: { url?: string } };
    }) => {
      const message =
        event.error?.message ??
        (event.context?.request?.url
          ? `Erreur de connexion à ${event.context.request.url}`
          : "Une erreur inattendue est survenue");
      setError(message);
    },
    [],
  );

  return (
    <AgentErrorContext.Provider value={{ error, setError }}>
      <CopilotKit
        agents__unsafe_dev_only={agents}
        showDevConsole={false}
        onError={handleError}
      >
        <Outlet />
      </CopilotKit>
    </AgentErrorContext.Provider>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
