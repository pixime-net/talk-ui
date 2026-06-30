import { createContext } from "react";
import type { ChatUIContextValue } from "./chat-ui-context-types";

export const ChatUIContext = createContext<ChatUIContextValue | null>(null);
