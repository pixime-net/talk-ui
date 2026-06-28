import { createRootRoute, Outlet } from "@tanstack/react-router";
import { CopilotKit } from "@copilotkit/react-core/v2";
import { agents } from "../config/agent";

function RootLayout() {
  return (
    <CopilotKit agents__unsafe_dev_only={agents}>
      <Outlet />
    </CopilotKit>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
