import type { Interrupt } from "@copilotkit/react-core/v2";
import type { ChatMessageViewModel } from "../config/normalize-messages";
import type { ModelAlias, ThinkingEffort } from "../config/models";

export interface ChatUIContextValue {
  visibleMessages: ChatMessageViewModel[];
  isRunning: boolean;
  error: string | null;
  showTools: boolean;
  selectedModel: ModelAlias;
  thinkingEffort: ThinkingEffort;
  supportsThinkingForSelectedModel: boolean;
  pendingInterrupt: Interrupt | null;
  sendMessage: (content: string) => void;
  continueFromInterrupt: () => void;
  setShowTools: (show: boolean) => void;
  setSelectedModel: (model: ModelAlias) => void;
  setThinkingEffort: (effort: ThinkingEffort) => void;
  clearError: () => void;
}
