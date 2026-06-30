import { useContext } from "react";
import { ChatUIContext } from "./chat-ui-context-core";

export function useChatUIContext() {
  const context = useContext(ChatUIContext);
  if (!context) {
    throw new Error("useChatUIContext must be used within a ChatUIProvider");
  }
  return context;
}
